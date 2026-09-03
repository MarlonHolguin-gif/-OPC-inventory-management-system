package opcback.products.service;

import opcback.products.dto.UnitRequest;
import opcback.products.dto.UnitResponse;
import opcback.products.entity.Unit;
import opcback.products.repository.ProductRepository;
import opcback.products.repository.ProductUnitRepository;
import opcback.products.repository.UnitRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Reglas de negocio de UnitService: nombre y abreviatura únicos, borrado
 * lógico (active) y borrado físico bloqueado si algún producto la usa.
 */
@ExtendWith(MockitoExtension.class)
class UnitServiceTest {

    private static final Long UNIT_ID = 1L;

    @Mock
    private UnitRepository unitRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private ProductUnitRepository productUnitRepository;

    private UnitService unitService;
    private Unit unit;

    @BeforeEach
    void setUp() {
        unitService = new UnitService(unitRepository, productRepository, productUnitRepository);

        unit = new Unit();
        unit.setId(UNIT_ID);
        unit.setName("Unidad");
        unit.setAbbreviation("UN");
        unit.setActive(true);

        lenient().when(unitRepository.save(any(Unit.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void noSePuedeCrearUnaUnidadConNombreYaRegistrado() {
        when(unitRepository.existsByNameIgnoreCase("Unidad")).thenReturn(true);

        assertThatThrownBy(() -> unitService.create(new UnitRequest("Unidad", "UN")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("nombre");

        verify(unitRepository, never()).save(any());
    }

    @Test
    void noSePuedeCrearUnaUnidadConAbreviaturaYaRegistrada() {
        when(unitRepository.existsByNameIgnoreCase("Unidades")).thenReturn(false);
        when(unitRepository.existsByAbbreviationIgnoreCase("UN")).thenReturn(true);

        assertThatThrownBy(() -> unitService.create(new UnitRequest("Unidades", "UN")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("abreviatura");

        verify(unitRepository, never()).save(any());
    }

    @Test
    void desactivarYReactivarUnaUnidadAlternaElFlagActive() {
        when(unitRepository.findById(UNIT_ID)).thenReturn(Optional.of(unit));

        assertThat(unitService.deactivate(UNIT_ID).active()).isFalse();
        assertThat(unit.isActive()).isFalse();

        UnitResponse reactivated = unitService.reactivate(UNIT_ID);
        assertThat(reactivated.active()).isTrue();
        assertThat(unit.isActive()).isTrue();
    }

    @Test
    void noSePuedeEliminarUnaUnidadQueUsaAlgunProducto() {
        when(unitRepository.findById(UNIT_ID)).thenReturn(Optional.of(unit));
        when(productRepository.existsByBaseUnitId(UNIT_ID)).thenReturn(true);

        assertThatThrownBy(() -> unitService.delete(UNIT_ID))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("hay productos que la usan");

        verify(unitRepository, never()).delete(any());
    }

    @Test
    void seEliminaUnaUnidadQueNoUsaNingunProducto() {
        when(unitRepository.findById(UNIT_ID)).thenReturn(Optional.of(unit));
        when(productRepository.existsByBaseUnitId(UNIT_ID)).thenReturn(false);
        when(productUnitRepository.existsByUnitId(UNIT_ID)).thenReturn(false);

        assertThatCode(() -> unitService.delete(UNIT_ID)).doesNotThrowAnyException();

        verify(unitRepository).delete(unit);
    }
}
