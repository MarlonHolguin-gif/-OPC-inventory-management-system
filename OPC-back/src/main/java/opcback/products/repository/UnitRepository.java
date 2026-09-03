package opcback.products.repository;

import opcback.products.entity.Unit;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UnitRepository extends JpaRepository<Unit, Long> {

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

    boolean existsByAbbreviationIgnoreCase(String abbreviation);

    boolean existsByAbbreviationIgnoreCaseAndIdNot(String abbreviation, Long id);
}
