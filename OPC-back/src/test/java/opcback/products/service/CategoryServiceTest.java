package opcback.products.service;

import opcback.products.dto.CategoryRequest;
import opcback.products.entity.Category;
import opcback.products.repository.CategoryRepository;
import opcback.products.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Reglas de negocio de CategoryService: nombre único y borrado físico
 * bloqueado si hay productos asociados. El resto es CRUD directo.
 */
@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    private static final Long CATEGORY_ID = 2L;

    @Mock
    private CategoryRepository categoryRepository;
    @Mock
    private ProductRepository productRepository;

    private CategoryService categoryService;
    private Category category;

    @BeforeEach
    void setUp() {
        categoryService = new CategoryService(categoryRepository, productRepository);

        category = new Category();
        category.setId(CATEGORY_ID);
        category.setName("Bebidas");
        category.setActive(true);
    }

    @Test
    void noSePuedeCrearUnaCategoriaConNombreYaRegistrado() {
        when(categoryRepository.existsByNameIgnoreCase("Bebidas")).thenReturn(true);

        assertThatThrownBy(() -> categoryService.create(new CategoryRequest("Bebidas", null)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Ya existe una categoría");

        verify(categoryRepository, never()).save(any());
    }

    @Test
    void noSePuedeRenombrarUnaCategoriaAlNombreDeOtra() {
        when(categoryRepository.findById(CATEGORY_ID)).thenReturn(Optional.of(category));
        when(categoryRepository.existsByNameIgnoreCaseAndIdNot("Aseo", CATEGORY_ID)).thenReturn(true);

        assertThatThrownBy(() -> categoryService.update(CATEGORY_ID, new CategoryRequest("Aseo", null)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Ya existe otra categoría");

        verify(categoryRepository, never()).save(any());
    }

    @Test
    void noSePuedeEliminarUnaCategoriaConProductosAsociados() {
        when(categoryRepository.findById(CATEGORY_ID)).thenReturn(Optional.of(category));
        when(productRepository.existsByCategoryId(CATEGORY_ID)).thenReturn(true);

        assertThatThrownBy(() -> categoryService.delete(CATEGORY_ID))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("hay productos asociados");

        verify(categoryRepository, never()).delete(any());
    }

    @Test
    void seEliminaUnaCategoriaSinProductosAsociados() {
        when(categoryRepository.findById(CATEGORY_ID)).thenReturn(Optional.of(category));
        when(productRepository.existsByCategoryId(CATEGORY_ID)).thenReturn(false);

        assertThatCode(() -> categoryService.delete(CATEGORY_ID)).doesNotThrowAnyException();

        verify(categoryRepository).delete(category);
    }
}
