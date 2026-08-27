package opcback.sales.service;

import lombok.RequiredArgsConstructor;
import opcback.exception.ResourceNotFoundException;
import opcback.products.entity.Product;
import opcback.products.repository.ProductRepository;
import opcback.sales.dto.PriceListCreateRequest;
import opcback.sales.dto.PriceListItemRequest;
import opcback.sales.dto.PriceListItemResponse;
import opcback.sales.dto.PriceListResponse;
import opcback.sales.dto.PriceListUpdateRequest;
import opcback.sales.entity.PriceList;
import opcback.sales.entity.PriceListItem;
import opcback.sales.repository.PriceListRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * La unicidad "un solo precio activo por producto dentro de una misma
 * lista" está garantizada a nivel de esquema (uq_ma_price_list_items sobre
 * price_list_id+product_id) — este service valida antes de insertar para
 * dar un mensaje claro en vez de dejar que reviente la restricción de BD.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PriceListService {

    private final PriceListRepository priceListRepository;
    private final ProductRepository productRepository;

    public List<PriceListResponse> listAll() {
        return priceListRepository.findAll().stream().map(this::toResponse).toList();
    }

    public PriceListResponse getById(Long id) {
        return toResponse(findPriceListOrThrow(id));
    }

    @Transactional
    public PriceListResponse create(PriceListCreateRequest request) {
        PriceList priceList = new PriceList();
        priceList.setName(request.name());
        priceList.setDescription(request.description());
        priceList.setActive(true);
        priceList.setStartDate(request.startDate());
        priceList.setEndDate(request.endDate());
        priceList.setUpdatedAt(LocalDateTime.now());

        if (request.items() != null) {
            Set<Long> seenProductIds = new HashSet<>();
            for (PriceListItemRequest itemRequest : request.items()) {
                if (!seenProductIds.add(itemRequest.productId())) {
                    throw new IllegalArgumentException(
                            "El producto " + itemRequest.productId() + " está duplicado en la lista de precios");
                }
                priceList.getItems().add(buildItem(priceList, itemRequest));
            }
        }

        PriceList saved = priceListRepository.save(priceList);
        return toResponse(saved);
    }

    @Transactional
    public PriceListResponse update(Long id, PriceListUpdateRequest request) {
        PriceList priceList = findPriceListOrThrow(id);
        priceList.setName(request.name());
        priceList.setDescription(request.description());
        priceList.setStartDate(request.startDate());
        priceList.setEndDate(request.endDate());
        priceList.setUpdatedAt(LocalDateTime.now());

        return toResponse(priceListRepository.save(priceList));
    }

    @Transactional
    public PriceListResponse deactivate(Long id) {
        PriceList priceList = findPriceListOrThrow(id);
        priceList.setActive(false);
        priceList.setUpdatedAt(LocalDateTime.now());
        return toResponse(priceListRepository.save(priceList));
    }

    @Transactional
    public PriceListResponse reactivate(Long id) {
        PriceList priceList = findPriceListOrThrow(id);
        priceList.setActive(true);
        priceList.setUpdatedAt(LocalDateTime.now());
        return toResponse(priceListRepository.save(priceList));
    }

    /**
     * Crea el precio del producto en la lista si no existe, o lo
     * actualiza si ya existe — así la unicidad nunca depende de que el
     * cliente adivine si debe crear o editar. Opera sobre la colección
     * dueña (priceList.items) en vez del repositorio de ítems directamente:
     * con cascade=ALL + orphanRemoval=true, modificar el hijo por fuera de
     * la colección del padre hace que Hibernate reviva/ignore el cambio al
     * hacer merge-cascade sobre una colección todavía no inicializada.
     */
    @Transactional
    public PriceListResponse upsertItem(Long priceListId, PriceListItemRequest request) {
        PriceList priceList = findPriceListOrThrow(priceListId);

        PriceListItem existing = priceList.getItems().stream()
                .filter(item -> item.getProduct().getId().equals(request.productId()))
                .findFirst()
                .orElse(null);

        if (existing != null) {
            existing.setPrice(request.price());
        } else {
            priceList.getItems().add(buildItem(priceList, request));
        }

        priceList.setUpdatedAt(LocalDateTime.now());
        return toResponse(priceListRepository.save(priceList));
    }

    @Transactional
    public PriceListResponse removeItem(Long priceListId, Long productId) {
        PriceList priceList = findPriceListOrThrow(priceListId);

        boolean removed = priceList.getItems()
                .removeIf(item -> item.getProduct().getId().equals(productId));
        if (!removed) {
            throw new ResourceNotFoundException(
                    "La lista " + priceList.getName() + " no tiene un precio para el producto " + productId);
        }

        priceList.setUpdatedAt(LocalDateTime.now());
        return toResponse(priceListRepository.save(priceList));
    }

    private PriceListItem buildItem(PriceList priceList, PriceListItemRequest request) {
        Product product = productRepository.findById(request.productId())
                .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado: " + request.productId()));

        PriceListItem item = new PriceListItem();
        item.setPriceList(priceList);
        item.setProduct(product);
        item.setPrice(request.price());
        return item;
    }

    private PriceListResponse toResponse(PriceList priceList) {
        List<PriceListItemResponse> items = priceList.getItems().stream()
                .map(PriceListItemResponse::from)
                .toList();
        return PriceListResponse.from(priceList, items);
    }

    PriceList findPriceListOrThrow(Long id) {
        return priceListRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lista de precios no encontrada: " + id));
    }
}
