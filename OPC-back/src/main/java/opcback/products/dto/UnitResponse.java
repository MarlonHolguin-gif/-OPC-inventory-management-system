package opcback.products.dto;

import opcback.products.entity.Unit;

public record UnitResponse(Long id, String name, String abbreviation, boolean active) {
    public static UnitResponse from(Unit unit) {
        return new UnitResponse(unit.getId(), unit.getName(), unit.getAbbreviation(), unit.isActive());
    }
}
