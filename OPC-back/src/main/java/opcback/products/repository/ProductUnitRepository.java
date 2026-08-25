package opcback.products.repository;

import opcback.products.entity.ProductUnit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductUnitRepository extends JpaRepository<ProductUnit, Long> {

    List<ProductUnit> findByProductId(Long productId);

    Optional<ProductUnit> findByProductIdAndUnitId(Long productId, Long unitId);
}
