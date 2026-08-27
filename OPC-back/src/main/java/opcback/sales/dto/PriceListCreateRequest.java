package opcback.sales.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;
import java.util.List;

public record PriceListCreateRequest(
        @NotBlank String name,
        String description,
        LocalDate startDate,
        LocalDate endDate,
        List<@Valid PriceListItemRequest> items
) {
}
