import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotaCredito from './NotaCredito';
import { notaCreditoApi } from '../../api/notaCreditoApi';
import { apiClient } from '../../api/client';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';

vi.mock('../../api/notaCreditoApi');
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

const mockNotas: any[] = [
  { id: 1, documento: 'NC001', fecha: '20240115000000', entidad: 'Cliente A', concepto: 'Nota de crédito', ncf: 'NCF001', total: 500, estado: 1, periodo: 0 },
  { id: 2, documento: 'NC002', fecha: '20240116000000', entidad: 'Cliente B', concepto: 'Ajuste', ncf: '', total: 200, estado: 0, periodo: 0 },
];
const mockPdfBlob = new Blob(['PDF content'], { type: 'application/pdf' });

describe('NotaCredito', () => {
  let navigateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    navigateMock = vi.fn();
    (useNavigate as any).mockReturnValue(navigateMock);
    (useAuthStore as any).mockImplementation((s: any) => s({ sucursalActiva: 1 }));
    (useUIStore as any).mockImplementation((s: any) => s({ resetToolbar: vi.fn(), setActiveModule: vi.fn(), setNuevoCallback: vi.fn() }));
    vi.clearAllMocks();
  });

  describe('Initial Load', () => {
    test('loads data on mount with tipoEntidad=CLI', async () => {
      (notaCreditoApi.obtenerVista as any).mockResolvedValue(mockNotas);
      render(<MemoryRouter><NotaCredito tipoEntidad="CLI" /></MemoryRouter>);
      expect(notaCreditoApi.obtenerVista).toHaveBeenCalledWith(1, 'CLI', expect.any(String), expect.any(String), 25, 0, undefined);
      await waitFor(() => {
        expect(screen.getByText('NC001')).toBeInTheDocument();
        expect(screen.getByText('NC002')).toBeInTheDocument();
      });
    });

    test('handles error state', async () => {
      (notaCreditoApi.obtenerVista as any).mockRejectedValue(new Error('API Error'));
      render(<MemoryRouter><NotaCredito tipoEntidad="CLI" /></MemoryRouter>);
      await waitFor(() => {
        expect(screen.getByText(/error al cargar notas crédito/i)).toBeInTheDocument();
        expect(screen.getByText(/reintentar/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search', () => {
    test('searches by document', async () => {
      (notaCreditoApi.filtrar as any).mockResolvedValue([mockNotas[0]]);
      render(<MemoryRouter><NotaCredito tipoEntidad="CLI" /></MemoryRouter>);
      const searchInput = screen.getByPlaceholderText(/buscar documento, ncf, concepto/i);
      await userEvent.type(searchInput, 'NC001');
      await userEvent.keyboard('{enter}');
      expect(notaCreditoApi.filtrar).toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByText('NC001')).toBeInTheDocument();
        expect(screen.queryByText('NC002')).not.toBeInTheDocument();
      });
    });
  });

  describe('Filters', () => {
    test('applies date and estado filters', async () => {
      (notaCreditoApi.obtenerVista as any).mockResolvedValue(mockNotas);
      render(<MemoryRouter><NotaCredito tipoEntidad="CLI" /></MemoryRouter>);
      await userEvent.click(screen.getByRole('button', { name: /aplicar filtro/i }));
      expect(notaCreditoApi.obtenerVista).toHaveBeenCalledWith(1, 'CLI', '20240101000000', '20241231235959', 25, 0, 1);
    });
  });

  describe('Navigation', () => {
    test('navigates to create page when Nuevo clicked', async () => {
      (notaCreditoApi.obtenerVista as any).mockResolvedValue(mockNotas);
      render(<MemoryRouter><NotaCredito tipoEntidad="CLI" /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('NC001')).toBeInTheDocument());
      await userEvent.click(screen.getByRole('button', { name: /nuevo/i }));
      expect(navigateMock).toHaveBeenCalledWith('/FNCCLI/nuevo');
    });

    test('document link has correct href', async () => {
      (notaCreditoApi.obtenerVista as any).mockResolvedValue(mockNotas);
      render(<MemoryRouter><NotaCredito tipoEntidad="CLI" /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('NC001')).toBeInTheDocument());
      expect(screen.getByText('NC001').closest('a')).toHaveAttribute('href', '/FNCCLI/1');
    });
  });

  describe('Print', () => {
    test('opens print preview', async () => {
      (notaCreditoApi.obtenerVista as any).mockResolvedValue(mockNotas);
      (apiClient.get as any).mockResolvedValue({ data: mockPdfBlob });
      const { container } = render(<MemoryRouter><NotaCredito tipoEntidad="CLI" /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('NC001')).toBeInTheDocument());
      await userEvent.click(screen.getByText('NC001').closest('tr')!);
      const printBtn = container.querySelector('[data-icon="printer"]')?.closest('button');
      expect(printBtn).not.toBeNull();
      await userEvent.click(printBtn!);
      expect(apiClient.get).toHaveBeenCalledWith(`/reportes/contabilidad/nota-credito/1/${mockNotas[0].id}`, { responseType: 'blob' });
    });
  });

  describe('Edit', () => {
    test('navigates to edit page with editable document', async () => {
      (notaCreditoApi.obtenerVista as any).mockResolvedValue([{ ...mockNotas[0], estado: 0 }]);
      render(<MemoryRouter><NotaCredito tipoEntidad="CLI" /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('NC001')).toBeInTheDocument());
      await userEvent.click(screen.getByText('NC001').closest('tr')!);
      expect(screen.getByRole('button', { name: /editar/i })).toBeEnabled();
      await userEvent.click(screen.getByRole('button', { name: /editar/i }));
      expect(navigateMock).toHaveBeenCalledWith('/FNCCLI/1/editar');
    });
  });

  describe('TipoEntidad', () => {
    test('renders Suplidor column for SUP', async () => {
      (notaCreditoApi.obtenerVista as any).mockResolvedValue(mockNotas);
      render(<MemoryRouter><NotaCredito tipoEntidad="SUP" /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('NC001')).toBeInTheDocument());
      const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
      expect(headers).toEqual(expect.arrayContaining(['Suplidor']));
    });
  });

  describe('Columns', () => {
    test('renders expected column headers', async () => {
      (notaCreditoApi.obtenerVista as any).mockResolvedValue(mockNotas);
      render(<MemoryRouter><NotaCredito tipoEntidad="CLI" /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('NC001')).toBeInTheDocument());
      const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
      expect(headers).toEqual(expect.arrayContaining(['Documento', 'Cliente', 'Concepto', 'NCF', 'Total', 'Estado']));
    });
  });
});
