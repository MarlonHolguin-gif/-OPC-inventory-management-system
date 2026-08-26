package opcback.purchases.dto;

import opcback.purchases.entity.Supplier;

public record SupplierResponse(
        Long id,
        String name,
        String taxId,
        String contact,
        String phone,
        String email,
        String address,
        boolean active
) {
    public static SupplierResponse from(Supplier supplier) {
        return new SupplierResponse(supplier.getId(), supplier.getName(), supplier.getTaxId(), supplier.getContact(),
                supplier.getPhone(), supplier.getEmail(), supplier.getAddress(), supplier.isActive());
    }
}
