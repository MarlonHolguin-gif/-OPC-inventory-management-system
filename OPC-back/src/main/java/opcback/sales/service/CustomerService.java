package opcback.sales.service;

import lombok.RequiredArgsConstructor;
import opcback.exception.ResourceNotFoundException;
import opcback.sales.dto.CustomerRequest;
import opcback.sales.dto.CustomerResponse;
import opcback.sales.entity.Customer;
import opcback.sales.repository.CustomerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomerService {

    private final CustomerRepository customerRepository;

    public List<CustomerResponse> listAll() {
        return customerRepository.findAll().stream().map(CustomerResponse::from).toList();
    }

    public CustomerResponse getById(Long id) {
        return CustomerResponse.from(findCustomerOrThrow(id));
    }

    @Transactional
    public CustomerResponse create(CustomerRequest request) {
        Customer customer = new Customer();
        customer.setName(request.name());
        customer.setDocumentType(request.documentType());
        customer.setDocumentNumber(request.documentNumber());
        customer.setPhone(request.phone());
        customer.setEmail(request.email());
        customer.setActive(true);
        customer.setCreatedAt(LocalDateTime.now());

        return CustomerResponse.from(customerRepository.save(customer));
    }

    @Transactional
    public CustomerResponse update(Long id, CustomerRequest request) {
        Customer customer = findCustomerOrThrow(id);
        customer.setName(request.name());
        customer.setDocumentType(request.documentType());
        customer.setDocumentNumber(request.documentNumber());
        customer.setPhone(request.phone());
        customer.setEmail(request.email());

        return CustomerResponse.from(customerRepository.save(customer));
    }

    @Transactional
    public CustomerResponse deactivate(Long id) {
        Customer customer = findCustomerOrThrow(id);
        customer.setActive(false);
        return CustomerResponse.from(customerRepository.save(customer));
    }

    @Transactional
    public CustomerResponse reactivate(Long id) {
        Customer customer = findCustomerOrThrow(id);
        customer.setActive(true);
        return CustomerResponse.from(customerRepository.save(customer));
    }

    private Customer findCustomerOrThrow(Long id) {
        return customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado: " + id));
    }
}
