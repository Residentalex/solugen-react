import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TransferenciaAlmacen from './TransferenciaAlmacen';
import { transferenciaAlmacenApi } from '../../api/transferenciaAlmacenApi';
import { apiClient } from '../../api/client';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';

vi.mock('../../api/transferenciaAlmacenApi');
vi.mock('../../api/client');
vi.mock('../../stores/authStore');
vi.mock('../../stores/uiStore');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: vi.fn() };
});
vi.mock('../../components/PermissionGate', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../../components/FiltrosDocumento/FiltrosDocumento', () => ({
  __esModule: true,
  default: ({ onAplicar }: { onAplicar: (n: { desde?: string; hasta?: string; estado?: number }) => void }) => (
    <div data-testid="filtros-documento">
      <button onClick={() => onAplicar({ desde: '20240101000000', hasta: '20241231235959', estado: 1 })}>Aplicar Filtro</button>
    </div>
  ),
}));

const mockTransferencias: any[] = [
  { id: 1, documento: 'TRP001', fecha: '20240115000000', entidad: 'Almacen A', concepto: 'Transferencia de inventario', almacenOrigen: 'Almacen Principal', almacenDestino: 'Almacen Secundario', estado: 1, periodo: 0 },
  { id: 2, documento: 'TRP002', fecha: '20240116000000', entidad: 'Almacen B', concepto: 'Reabastecimiento', almacenOrigen: 'Almacen Secundario', almacenDestino: 'Almacen Principal', estado: 0, periodo: 0 },
];
const mockPdfBlob = new Blob(['PDF content'], { type: 'application/pdf' });

describe('TransferenciaAlmacen', () => {
  let navigateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    navigateMock = vi.fn();
    (useNavigate as any).mockReturnValue(navigateMock);
    (useAuthStore as any).mockImplementation((s: any) => s({ sucursalActiva: 1 }));
    (useUIStore as any).mockImplementation((s: any) => s({ resetToolbar: vi.fn(), setActiveModule: vi.fn(), setNuevoCallback: vi.fn() }));
    vi.clearAllMocks();
  });

  describe('Initial Load', () => {
    test('loads data on mount', async () => {
      (transferenciaAlmacenApi.obtenerVista as any).mockResolvedValue(mockTransferencias);
      render(<MemoryRouter><TransferenciaAlmacen /></MemoryRouter>);
      expect(transferenciaAlmacenApi.obtenerVista).toHaveBeenCalledWith(1, expect.any(String), expect.any(String), 25, 0, undefined);
      await waitFor(() => {
        expect(screen.getByText('TRP001')).toBeInTheDocument();
        expect(screen.getByText('TRP002')).toBeInTheDocument();
      });
    });
    test('handles error state', async () => {
      (transferenciaAlmacenApi.obtenerVista as any).mockRejectedValue(new Error('API Error'));
      render(<MemoryRouter><TransferenciaAlmacen /></MemoryRouter>);
      await waitFor(() => {
        expect(screen.getByText(/error al cargar transferencias de almacén/i)).toBeInTheDocument();
        expect(screen.getByText(/reintentar/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search', () => {
    test('searches by document', async () => {
      (transferenciaAlmacenApi.filtrar as any).mockResolvedValue([mockTransferencias[0]]);
      render(<MemoryRouter><TransferenciaAlmacen /></MemoryRouter>);
      const searchInput = screen.getByPlaceholderText(/buscar documento, concepto/i);
      await userEvent.type(searchInput, 'TRP001');
      await userEvent.keyboard('{enter}');
      expect(transferenciaAlmacenApi.filtrar).toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByText('TRP001')).toBeInTheDocument();
        expect(screen.queryByText('TRP002')).not.toBeInTheDocument();
      });
    });
  });

  describe('Filters', () => {
    test('applies date and estado filters', async () => {
      (transferenciaAlmacenApi.obtenerVista as any).mockResolvedValue(mockTransferencias);
      render(<MemoryRouter><TransferenciaAlmacen /></MemoryRouter>);
      await userEvent.click(screen.getByRole('button', { name: /aplicar filtro/i }));
      expect(transferenciaAlmacenApi.obtenerVista).toHaveBeenCalledWith(1, '20240101000000', '20241231235959', 25, 0, 1);
    });
  });

  describe('Navigation', () => {
    test('navigates to create page', async () => {
      (transferenciaAlmacenApi.obtenerVista as any).mockResolvedValue(mockTransferencias);
      render(<MemoryRouter><TransferenciaAlmacen /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('TRP001')).toBeInTheDocument());
      await userEvent.click(screen.getByRole('button', { name: /nuevo/i }));
      expect(navigateMock).toHaveBeenCalledWith('/FTRP/nuevo');
    });
    test('document link has correct href', async () => {
      (transferenciaAlmacenApi.obtenerVista as any).mockResolvedValue(mockTransferencias);
      render(<MemoryRouter><TransferenciaAlmacen /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('TRP001')).toBeInTheDocument());
      expect(screen.getByText('TRP001').closest('a')).toHaveAttribute('href', '/FTRP/1');
    });
  });

  describe('Print', () => {
    test('opens print preview', async () => {
      (transferenciaAlmacenApi.obtenerVista as any).mockResolvedValue(mockTransferencias);
      (apiClient.get as any).mockResolvedValue({ data: mockPdfBlob });
      const { container } = render(<MemoryRouter><TransferenciaAlmacen /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('TRP001')).toBeInTheDocument());
      await userEvent.click(screen.getByText('TRP001').closest('tr')!);
      const printBtn = container.querySelector('[data-icon="printer"]')?.closest('button');
      expect(printBtn).not.toBeNull();
      await userEvent.click(printBtn!);
      expect(apiClient.get).toHaveBeenCalledWith(`/reportes/inventario/transferencia/1/${mockTransferencias[0].id}`, { responseType: 'blob' });
    });
  });

  describe('Edit', () => {
    test('navigates to edit page', async () => {
      (transferenciaAlmacenApi.obtenerVista as any).mockResolvedValue([{ ...mockTransferencias[0], estado: 0 }]);
      render(<MemoryRouter><TransferenciaAlmacen /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('TRP001')).toBeInTheDocument());
      await userEvent.click(screen.getByText('TRP001').closest('tr')!);
      await userEvent.click(screen.getByRole('button', { name: /editar/i }));
      expect(navigateMock).toHaveBeenCalledWith('/FTRP/1/editar');
    });
  });

  describe('Columns', () => {
    test('renders expected column headers', async () => {
      (transferenciaAlmacenApi.obtenerVista as any).mockResolvedValue(mockTransferencias);
      render(<MemoryRouter><TransferenciaAlmacen /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('TRP001')).toBeInTheDocument());
      const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
      expect(headers).toEqual(expect.arrayContaining(['Documento', 'Entidad', 'Concepto', 'Almacén Origen', 'Almacén Destino', 'Estado']));
    });
  });
});
