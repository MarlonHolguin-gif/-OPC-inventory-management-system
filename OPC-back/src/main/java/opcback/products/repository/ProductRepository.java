package opcback.products.repository;

import opcback.products.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {

    boolean existsBySku(String sku);

    boolean existsByCategoryIdAndActiveTrue(Long categoryId);

    List<Product> findByActiveTrue();
}
