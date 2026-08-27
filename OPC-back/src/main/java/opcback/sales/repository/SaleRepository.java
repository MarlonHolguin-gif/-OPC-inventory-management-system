package opcback.sales.repository;

import opcback.sales.entity.Sale;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SaleRepository extends JpaRepository<Sale, Long> {

    boolean existsBySaleNumber(String saleNumber);
}
