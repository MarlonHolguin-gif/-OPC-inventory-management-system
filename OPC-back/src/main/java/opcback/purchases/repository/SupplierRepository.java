package opcback.purchases.repository;

import opcback.purchases.entity.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SupplierRepository extends JpaRepository<Supplier, Long> {

    boolean existsByTaxId(String taxId);
}
