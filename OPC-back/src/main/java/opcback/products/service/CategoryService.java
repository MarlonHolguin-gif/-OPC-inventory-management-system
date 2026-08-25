package opcback.products.service;

import lombok.RequiredArgsConstructor;
import opcback.exception.ResourceNotFoundException;
import opcback.products.dto.CategoryRequest;
import opcback.products.dto.CategoryResponse;
import opcback.products.entity.Category;
import opcback.products.repository.CategoryRepository;
import opcback.products.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    public List<CategoryResponse> listAll() {
        return categoryRepository.findAll().stream().map(CategoryResponse::from).toList();
    }

    public CategoryResponse getById(Long id) {
        return CategoryResponse.from(findCategoryOrThrow(id));
    }

    @Transactional
    public CategoryResponse create(CategoryRequest request) {
        Category category = new Category();
        category.setName(request.name());
        category.setDescription(request.description());
        category.setActive(true);
        category.setUpdatedAt(LocalDateTime.now());
        return CategoryResponse.from(categoryRepository.save(category));
    }

    @Transactional
    public CategoryResponse update(Long id, CategoryRequest request) {
        Category category = findCategoryOrThrow(id);
        category.setName(request.name());
        category.setDescription(request.description());
        category.setUpdatedAt(LocalDateTime.now());
        return CategoryResponse.from(categoryRepository.save(category));
    }

    /**
     * Criterio de aceptación: no se puede desactivar una categoría con
     * productos activos asociados.
     */
    @Transactional
    public CategoryResponse deactivate(Long id) {
        Category category = findCategoryOrThrow(id);

        if (productRepository.existsByCategoryIdAndActiveTrue(id)) {
            throw new IllegalStateException(
                    "No se puede desactivar la categoría " + id + ": tiene productos activos asociados");
        }

        category.setActive(false);
        category.setUpdatedAt(LocalDateTime.now());
        return CategoryResponse.from(categoryRepository.save(category));
    }

    private Category findCategoryOrThrow(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Categoría no encontrada: " + id));
    }
}
