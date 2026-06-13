import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotaDebito from './NotaDebito';
import { notaDebitoApi } from '../../api/notaDebitoApi';
import { apiClient } from '../../api/client';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';

vi.mock('../../api/notaDebitoApi');
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
  { id: 1, documento: 'ND001', fecha: '20240115000000', entidad: 'Cliente A', concepto: 'Nota de débito', ncf: 'NCF001', total: 300, estado: 1, periodo: 0 },
  { id: 2, documento: 'ND002', fecha: '20240116000000', entidad: 'Cliente B', concepto: 'Ajuste por interés', ncf: '', total: 150, estado: 0, periodo: 0 },
];
const mockPdfBlob = new Blob(['PDF content'], { type: 'application/pdf' });

describe('NotaDebito', () => {
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
      (notaDebitoApi.obtenerVista as any).mockResolvedValue(mockNotas);
      render(<MemoryRouter><NotaDebito tipoEntidad="CLI" /></MemoryRouter>);
      expect(notaDebitoApi.obtenerVista).toHaveBeenCalledWith(1, 'CLI', expect.any(String), expect.any(String), 25, 0, undefined);
      await waitFor(() => {
        expect(screen.getByText('ND001')).toBeInTheDocument();
        expect(screen.getByText('ND002')).toBeInTheDocument();
      });
    });
    test('handles error state', async () => {
      (notaDebitoApi.obtenerVista as any).mockRejectedValue(new Error('API Error'));
      render(<MemoryRouter><NotaDebito tipoEntidad="CLI" /></MemoryRouter>);
      await waitFor(() => {
        expect(screen.getByText(/error al cargar notas débito/i)).toBeInTheDocument();
        expect(screen.getByText(/reintentar/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search', () => {
    test('searches by document', async () => {
      (notaDebitoApi.filtrar as any).mockResolvedValue([mockNotas[0]]);
      render(<MemoryRouter><NotaDebito tipoEntidad="CLI" /></MemoryRouter>);
      const searchInput = screen.getByPlaceholderText(/buscar documento, ncf, concepto/i);
      await userEvent.type(searchInput, 'ND001');
      await userEvent.keyboard('{enter}');
      expect(notaDebitoApi.filtrar).toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByText('ND001')).toBeInTheDocument();
        expect(screen.queryByText('ND002')).not.toBeInTheDocument();
      });
    });
  });

  describe('Filters', () => {
    test('applies date and estado filters', async () => {
      (notaDebitoApi.obtenerVista as any).mockResolvedValue(mockNotas);
      render(<MemoryRouter><NotaDebito tipoEntidad="CLI" /></MemoryRouter>);
      await userEvent.click(screen.getByRole('button', { name: /aplicar filtro/i }));
      expect(notaDebitoApi.obtenerVista).toHaveBeenCalledWith(1, 'CLI', '20240101000000', '20241231235959', 25, 0, 1);
    });
  });

  describe('Navigation', () => {
    test('navigates to create page', async () => {
      (notaDebitoApi.obtenerVista as any).mockResolvedValue(mockNotas);
      render(<MemoryRouter><NotaDebito tipoEntidad="CLI" /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('ND001')).toBeInTheDocument());
      await userEvent.click(screen.getByRole('button', { name: /nuevo/i }));
      expect(navigateMock).toHaveBeenCalledWith('/FNDCLI/nuevo');
    });
    test('document link has correct href', async () => {
      (notaDebitoApi.obtenerVista as any).mockResolvedValue(mockNotas);
      render(<MemoryRouter><NotaDebito tipoEntidad="CLI" /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('ND001')).toBeInTheDocument());
      expect(screen.getByText('ND001').closest('a')).toHaveAttribute('href', '/FNDCLI/1');
    });
  });

  describe('Print', () => {
    test('opens print preview', async () => {
      (notaDebitoApi.obtenerVista as any).mockResolvedValue(mockNotas);
      (apiClient.get as any).mockResolvedValue({ data: mockPdfBlob });
      const { container } = render(<MemoryRouter><NotaDebito tipoEntidad="CLI" /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('ND001')).toBeInTheDocument());
      await userEvent.click(screen.getByText('ND001').closest('tr')!);
      const printBtn = container.querySelector('[data-icon="printer"]')?.closest('button');
      expect(printBtn).not.toBeNull();
      await userEvent.click(printBtn!);
      expect(apiClient.get).toHaveBeenCalledWith(`/reportes/contabilidad/nota-debito/1/${mockNotas[0].id}`, { responseType: 'blob' });
    });
  });

  describe('Edit', () => {
    test('navigates to edit page', async () => {
      (notaDebitoApi.obtenerVista as any).mockResolvedValue([{ ...mockNotas[0], estado: 0 }]);
      render(<MemoryRouter><NotaDebito tipoEntidad="CLI" /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('ND001')).toBeInTheDocument());
      await userEvent.click(screen.getByText('ND001').closest('tr')!);
      await userEvent.click(screen.getByRole('button', { name: /editar/i }));
      expect(navigateMock).toHaveBeenCalledWith('/FNDCLI/1/editar');
    });
  });

  describe('TipoEntidad', () => {
    test('renders Suplidor column for SUP', async () => {
      (notaDebitoApi.obtenerVista as any).mockResolvedValue(mockNotas);
      render(<MemoryRouter><NotaDebito tipoEntidad="SUP" /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('ND001')).toBeInTheDocument());
      const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
      expect(headers).toEqual(expect.arrayContaining(['Suplidor']));
    });
  });

  describe('Columns', () => {
    test('renders expected column headers', async () => {
      (notaDebitoApi.obtenerVista as any).mockResolvedValue(mockNotas);
      render(<MemoryRouter><NotaDebito tipoEntidad="CLI" /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('ND001')).toBeInTheDocument());
      const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
      expect(headers).toEqual(expect.arrayContaining(['Documento', 'Cliente', 'Concepto', 'NCF', 'Total', 'Estado']));
    });
  });
});
