package opcback.auth.service;

import lombok.RequiredArgsConstructor;
import opcback.auth.dto.ChangePasswordRequest;
import opcback.auth.dto.UserCreateRequest;
import opcback.auth.dto.UserResponse;
import opcback.auth.dto.UserUpdateRequest;
import opcback.auth.entity.Role;
import opcback.auth.entity.User;
import opcback.auth.repository.RoleRepository;
import opcback.auth.repository.UserRepository;
import opcback.exception.ResourceNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserBranchService userBranchService;
    private final PasswordEncoder passwordEncoder;

    public List<UserResponse> listAll() {
        return userRepository.findAll().stream()
                .map(UserResponse::from)
                .toList();
    }

    public UserResponse getById(Long id) {
        return UserResponse.from(findUserOrThrow(id));
    }

    @Transactional
    public UserResponse create(UserCreateRequest request) {
        Role role = findRoleOrThrow(request.roleCode());

        User user = new User();
        user.setName(request.name());
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(role);
        user.setActive(true);

        LocalDateTime now = LocalDateTime.now();
        user.setCreatedAt(now);
        user.setUpdatedAt(now);

        User saved = userRepository.save(user);

        if (request.branchIds() != null) {
            for (Long branchId : request.branchIds()) {
                userBranchService.assign(saved.getId(), branchId);
            }
        }

        return UserResponse.from(saved);
    }

    @Transactional
    public UserResponse update(Long id, UserUpdateRequest request) {
        User user = findUserOrThrow(id);
        Role role = findRoleOrThrow(request.roleCode());

        user.setName(request.name());
        user.setEmail(request.email());
        user.setRole(role);
        user.setUpdatedAt(LocalDateTime.now());

        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public UserResponse deactivate(Long id) {
        User user = findUserOrThrow(id);
        user.setActive(false);
        user.setUpdatedAt(LocalDateTime.now());

        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public UserResponse reactivate(Long id) {
        User user = findUserOrThrow(id);
        user.setActive(true);
        user.setUpdatedAt(LocalDateTime.now());

        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public UserResponse changePassword(Long id, ChangePasswordRequest request) {
        User user = findUserOrThrow(id);
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setUpdatedAt(LocalDateTime.now());

        return UserResponse.from(userRepository.save(user));
    }

    private User findUserOrThrow(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: " + id));
    }

    private Role findRoleOrThrow(String roleCode) {
        return roleRepository.findByCode(roleCode)
                .orElseThrow(() -> new IllegalArgumentException("Rol inválido: " + roleCode));
    }
}
