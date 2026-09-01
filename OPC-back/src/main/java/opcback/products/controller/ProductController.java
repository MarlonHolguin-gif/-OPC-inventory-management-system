package opcback.products.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import opcback.products.dto.ProductCreateRequest;
import opcback.products.dto.ProductResponse;
import opcback.products.dto.ProductUpdateRequest;
import opcback.products.service.ProductService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * GET /api/products devuelve TODO (incluye inactivos) — es lo que debe
 * usarse para resolver product_id en histórico de movimientos.
 * GET /api/products/catalog es el catálogo de venta: solo productos activos.
 */
@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public List<ProductResponse> listAll() {
        return productService.listAll();
    }

    @GetMapping("/catalog")
    public List<ProductResponse> listCatalog() {
        return productService.listCatalog();
    }

    @GetMapping("/{id}")
    public ProductResponse getById(@PathVariable Long id) {
        return productService.getById(id);
    }

    @PreAuthorize("hasRole('GENERAL_ADMIN')")
    @PostMapping
    public ResponseEntity<ProductResponse> create(
            @Valid @RequestBody ProductCreateRequest request, Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.create(request, authentication));
    }

    @PreAuthorize("hasRole('GENERAL_ADMIN')")
    @PutMapping("/{id}")
    public ProductResponse update(@PathVariable Long id, @Valid @RequestBody ProductUpdateRequest request) {
        return productService.update(id, request);
    }

    @PreAuthorize("hasRole('GENERAL_ADMIN')")
    @PatchMapping("/{id}/deactivate")
    public ProductResponse deactivate(@PathVariable Long id) {
        return productService.deactivate(id);
    }

    @PreAuthorize("hasRole('GENERAL_ADMIN')")
    @PatchMapping("/{id}/reactivate")
    public ProductResponse reactivate(@PathVariable Long id) {
        return productService.reactivate(id);
    }
}
