package opcback.sales.dto;

import opcback.sales.entity.Customer;

public record CustomerResponse(
        Long id,
        String name,
        String documentType,
        String documentNumber,
        String phone,
        String email,
        boolean active
) {
    public static CustomerResponse from(Customer customer) {
        return new CustomerResponse(customer.getId(), customer.getName(), customer.getDocumentType(),
                customer.getDocumentNumber(), customer.getPhone(), customer.getEmail(), customer.isActive());
    }
}
