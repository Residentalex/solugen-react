import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SalidaAlmacen from './SalidaAlmacen';
import { salidaAlmacenApi } from '../../api/salidaAlmacenApi';
import { apiClient } from '../../api/client';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';

// Mocks
vi.mock('../../api/salidaAlmacenApi');
vi.mock('../../api/client');
vi.mock('../../stores/authStore');
vi.mock('../../stores/uiStore');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});
vi.mock('../../components/PermissionGate', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../../components/FiltrosDocumento/FiltrosDocumento', () => ({
  __esModule: true,
  default: ({
    onAplicar,
  }: {
    onAplicar: (nuevos: { desde?: string; hasta?: string; estado?: number }) => void;
  }) => (
    <div data-testid="filtros-documento">
      <button onClick={() => onAplicar({ desde: '20240101000000', hasta: '20241231235959', estado: 1 })}>
        Aplicar Filtro
      </button>
    </div>
  ),
}));

// Mock data
const mockMovimientos: any[] = [
  {
    id: 1,
    documento: 'SAP001',
    fecha: '20240115000000',
    fechaEntrega: '20240115000000',
    entidad: 'Cliente A',
    concepto: 'Salida de productos',
    total: 1000,
    estado: 1,
    periodo: 0,
    diasCredito: 30,
    almacenOrigen: 'Almacen Principal',
  },
  {
    id: 2,
    documento: 'SAP002',
    fecha: '20240116000000',
    entidad: 'Cliente B',
    concepto: 'Servicios',
    total: 500,
    estado: 0,
    periodo: 0,
    diasCredito: 15,
    almacenOrigen: 'Almacen Secundario',
  },
];

const mockPdfBlob = new Blob(['PDF content'], { type: 'application/pdf' });

describe('SalidaAlmacen', () => {
  let navigateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    navigateMock = vi.fn();
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(navigateMock);

    (useAuthStore as ReturnType<typeof vi.fn>).mockImplementation((selector: any) =>
      selector({ sucursalActiva: 1 })
    );

    (useUIStore as ReturnType<typeof vi.fn>).mockImplementation((selector: any) =>
      selector({
        resetToolbar: vi.fn(),
        setActiveModule: vi.fn(),
        setNuevoCallback: vi.fn(),
      })
    );

    vi.clearAllMocks();
  });

  describe('Initial Load', () => {
    test('loads data on mount and renders documents', async () => {
      (salidaAlmacenApi.obtenerVista as any).mockResolvedValue(mockMovimientos);

      render(<MemoryRouter><SalidaAlmacen /></MemoryRouter>);

      expect(salidaAlmacenApi.obtenerVista).toHaveBeenCalledWith(
        1,
        expect.any(String),
        expect.any(String),
        25,
        0,
        undefined
      );

      await waitFor(() => {
        expect(screen.getByText('SAP001')).toBeInTheDocument();
        expect(screen.getByText('SAP002')).toBeInTheDocument();
      });
    });

    test('handles error state', async () => {
      (salidaAlmacenApi.obtenerVista as any).mockRejectedValue(new Error('API Error'));

      render(<MemoryRouter><SalidaAlmacen /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.getByText(/error al cargar salidas de almacén/i)).toBeInTheDocument();
        expect(screen.getByText(/reintentar/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search', () => {
    test('searches by document', async () => {
      (salidaAlmacenApi.filtrar as any).mockResolvedValue([mockMovimientos[0]]);

      render(<MemoryRouter><SalidaAlmacen /></MemoryRouter>);

      const searchInput = screen.getByPlaceholderText(/buscar documento, concepto/i);
      await userEvent.type(searchInput, 'SAP001');
      await userEvent.keyboard('{enter}');

      expect(salidaAlmacenApi.filtrar).toHaveBeenCalled();

      await waitFor(() => {
        expect(screen.getByText('SAP001')).toBeInTheDocument();
        expect(screen.queryByText('SAP002')).not.toBeInTheDocument();
      });
    });
  });

  describe('Filters', () => {
    test('applies date and estado filters', async () => {
      (salidaAlmacenApi.obtenerVista as any).mockResolvedValue(mockMovimientos);

      render(<MemoryRouter><SalidaAlmacen /></MemoryRouter>);

      await userEvent.click(screen.getByRole('button', { name: /aplicar filtro/i }));

      expect(salidaAlmacenApi.obtenerVista).toHaveBeenCalledWith(
        1,
        '20240101000000',
        '20241231235959',
        25,
        0,
        1
      );
    });
  });

  describe('Navigation', () => {
    test('navigates to create page when Nuevo button clicked', async () => {
      (salidaAlmacenApi.obtenerVista as any).mockResolvedValue(mockMovimientos);

      render(<MemoryRouter><SalidaAlmacen /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.getByText('SAP001')).toBeInTheDocument();
      });

      const nuevoButton = screen.getByRole('button', { name: /nuevo/i });
      await userEvent.click(nuevoButton);

      expect(navigateMock).toHaveBeenCalledWith('/FSAP/nuevo');
    });

    test('document link has correct href', async () => {
      (salidaAlmacenApi.obtenerVista as any).mockResolvedValue(mockMovimientos);

      render(<MemoryRouter><SalidaAlmacen /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.getByText('SAP001')).toBeInTheDocument();
      });

      const documentLink = screen.getByText('SAP001').closest('a');
      expect(documentLink).toHaveAttribute('href', '/FSAP/1');
    });
  });

  describe('Print', () => {
    test('opens print preview when print button clicked', async () => {
      (salidaAlmacenApi.obtenerVista as any).mockResolvedValue(mockMovimientos);
      (apiClient.get as any).mockResolvedValue({ data: mockPdfBlob });

      const { container } = render(<MemoryRouter><SalidaAlmacen /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.getByText('SAP001')).toBeInTheDocument();
      });

      const firstRow = screen.getByText('SAP001').closest('tr');
      await userEvent.click(firstRow!);

      // Find the print button by its printer icon
      const printButton = container.querySelector('[data-icon="printer"]')?.closest('button');
      expect(printButton).not.toBeNull();
      expect(printButton).toBeEnabled();
      await userEvent.click(printButton!);

      expect(apiClient.get).toHaveBeenCalledWith(
        `/reportes/inventario/salida/1/${mockMovimientos[0].id}`,
        { responseType: 'blob' }
      );
    });
  });

  describe('Edit', () => {
    test('navigates to edit page when edit button clicked with editable document', async () => {
      const editableMovement = { ...mockMovimientos[0], estado: 0 };
      (salidaAlmacenApi.obtenerVista as any).mockResolvedValue([editableMovement]);

      render(<MemoryRouter><SalidaAlmacen /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.getByText('SAP001')).toBeInTheDocument();
      });

      const row = screen.getByText('SAP001').closest('tr');
      await userEvent.click(row!);

      const editButton = screen.getByRole('button', { name: /editar/i });
      expect(editButton).toBeEnabled();

      await userEvent.click(editButton);
      expect(navigateMock).toHaveBeenCalledWith('/FSAP/1/editar');
    });
  });

  describe('Columns', () => {
    test('renders expected column headers', async () => {
      (salidaAlmacenApi.obtenerVista as any).mockResolvedValue(mockMovimientos);
      render(<MemoryRouter><SalidaAlmacen /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('SAP001')).toBeInTheDocument());
      const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
      expect(headers).toEqual(
        expect.arrayContaining(['Documento', 'Fecha', 'Entidad', 'Concepto', 'Almacén', 'Total', 'Estado'])
      );
    });
  });
});
