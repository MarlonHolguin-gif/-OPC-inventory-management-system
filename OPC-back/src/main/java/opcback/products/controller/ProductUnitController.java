package opcback.products.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import opcback.products.dto.ProductUnitRequest;
import opcback.products.dto.ProductUnitResponse;
import opcback.products.dto.UnitConversionResponse;
import opcback.products.service.ProductUnitService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/products/{productId}/units")
@RequiredArgsConstructor
public class ProductUnitController {

    private final ProductUnitService productUnitService;

    @GetMapping
    public List<ProductUnitResponse> listByProduct(@PathVariable Long productId) {
        return productUnitService.listByProduct(productId);
    }

    @GetMapping("/convert")
    public UnitConversionResponse convert(
            @PathVariable Long productId,
            @RequestParam BigDecimal quantity,
            @RequestParam Long fromUnitId,
            @RequestParam Long toUnitId) {
        return productUnitService.convert(productId, quantity, fromUnitId, toUnitId);
    }

    @PreAuthorize("hasRole('GENERAL_ADMIN')")
    @PostMapping
    public ProductUnitResponse assign(@PathVariable Long productId, @Valid @RequestBody ProductUnitRequest request) {
        return productUnitService.assign(productId, request);
    }

    @PreAuthorize("hasRole('GENERAL_ADMIN')")
    @DeleteMapping("/{unitId}")
    public void remove(@PathVariable Long productId, @PathVariable Long unitId) {
        productUnitService.remove(productId, unitId);
    }
}
