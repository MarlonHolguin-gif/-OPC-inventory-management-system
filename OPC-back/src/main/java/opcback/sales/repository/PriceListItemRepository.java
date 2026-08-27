package opcback.sales.repository;

import opcback.sales.entity.PriceListItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PriceListItemRepository extends JpaRepository<PriceListItem, Long> {

    Optional<PriceListItem> findByPriceListIdAndProductId(Long priceListId, Long productId);
}
