package opcback.sales.dto;

import opcback.sales.entity.PriceList;

import java.time.LocalDate;
import java.util.List;

public record PriceListResponse(
        Long id,
        String name,
        String description,
        boolean active,
        LocalDate startDate,
        LocalDate endDate,
        List<PriceListItemResponse> items
) {
    public static PriceListResponse from(PriceList priceList, List<PriceListItemResponse> items) {
        return new PriceListResponse(priceList.getId(), priceList.getName(), priceList.getDescription(),
                priceList.isActive(), priceList.getStartDate(), priceList.getEndDate(), items);
    }
}
