package opcback.sales.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record PriceListUpdateRequest(
        @NotBlank String name,
        String description,
        LocalDate startDate,
        LocalDate endDate
) {
}
