package opcback.products.dto;

import opcback.products.entity.Category;

public record CategoryResponse(Long id, String name, String description, boolean active) {
    public static CategoryResponse from(Category category) {
        return new CategoryResponse(category.getId(), category.getName(), category.getDescription(), category.isActive());
    }
}
