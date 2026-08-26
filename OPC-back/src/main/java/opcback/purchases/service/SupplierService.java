package opcback.purchases.service;

import lombok.RequiredArgsConstructor;
import opcback.exception.ResourceNotFoundException;
import opcback.purchases.dto.SupplierRequest;
import opcback.purchases.dto.SupplierResponse;
import opcback.purchases.entity.Supplier;
import opcback.purchases.repository.SupplierRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SupplierService {

    private final SupplierRepository supplierRepository;

    public List<SupplierResponse> listAll() {
        return supplierRepository.findAll().stream().map(SupplierResponse::from).toList();
    }

    public SupplierResponse getById(Long id) {
        return SupplierResponse.from(findSupplierOrThrow(id));
    }

    @Transactional
    public SupplierResponse create(SupplierRequest request) {
        assertTaxIdAvailable(request.taxId());

        Supplier supplier = new Supplier();
        supplier.setName(request.name());
        supplier.setTaxId(request.taxId());
        supplier.setContact(request.contact());
        supplier.setPhone(request.phone());
        supplier.setEmail(request.email());
        supplier.setAddress(request.address());
        supplier.setActive(true);

        LocalDateTime now = LocalDateTime.now();
        supplier.setCreatedAt(now);
        supplier.setUpdatedAt(now);

        return SupplierResponse.from(supplierRepository.save(supplier));
    }

    @Transactional
    public SupplierResponse update(Long id, SupplierRequest request) {
        Supplier supplier = findSupplierOrThrow(id);

        if (request.taxId() != null && !request.taxId().equals(supplier.getTaxId())) {
            assertTaxIdAvailable(request.taxId());
        }

        supplier.setName(request.name());
        supplier.setTaxId(request.taxId());
        supplier.setContact(request.contact());
        supplier.setPhone(request.phone());
        supplier.setEmail(request.email());
        supplier.setAddress(request.address());
        supplier.setUpdatedAt(LocalDateTime.now());

        return SupplierResponse.from(supplierRepository.save(supplier));
    }

    @Transactional
    public SupplierResponse deactivate(Long id) {
        Supplier supplier = findSupplierOrThrow(id);
        supplier.setActive(false);
        supplier.setUpdatedAt(LocalDateTime.now());
        return SupplierResponse.from(supplierRepository.save(supplier));
    }

    @Transactional
    public SupplierResponse reactivate(Long id) {
        Supplier supplier = findSupplierOrThrow(id);
        supplier.setActive(true);
        supplier.setUpdatedAt(LocalDateTime.now());
        return SupplierResponse.from(supplierRepository.save(supplier));
    }

    private void assertTaxIdAvailable(String taxId) {
        if (taxId != null && supplierRepository.existsByTaxId(taxId)) {
            throw new IllegalStateException("Ya existe un proveedor con el tax_id: " + taxId);
        }
    }

    private Supplier findSupplierOrThrow(Long id) {
        return supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado: " + id));
    }
}
