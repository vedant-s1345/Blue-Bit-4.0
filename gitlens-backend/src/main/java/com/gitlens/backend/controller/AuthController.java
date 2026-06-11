package com.gitlens.backend.controller;

import com.gitlens.backend.dto.AuthRequest;
import com.gitlens.backend.dto.AuthResponse;
import com.gitlens.backend.model.User;
import com.gitlens.backend.repository.UserRepo;
import com.gitlens.backend.security.JwtUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepo userRepo;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;

    public AuthController(UserRepo userRepo, JwtUtil jwtUtil, PasswordEncoder passwordEncoder) {
        this.userRepo        = userRepo;
        this.jwtUtil         = jwtUtil;
        this.passwordEncoder = passwordEncoder;
    }

    // POST /api/auth/register
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AuthRequest req) {
        if (req.getEmail() == null || req.getEmail().isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        if (req.getPassword() == null || req.getPassword().length() < 6)
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 6 characters"));
        if (req.getName() == null || req.getName().isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "Name is required"));
        if (userRepo.existsByEmail(req.getEmail().toLowerCase().trim()))
            return ResponseEntity.badRequest().body(Map.of("error", "Email already registered"));

        User user = new User();
        user.setName(req.getName().trim());
        user.setEmail(req.getEmail().toLowerCase().trim());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        userRepo.save(user);

        String token = jwtUtil.generateToken(user.getId(), user.getEmail());
        return ResponseEntity.ok(new AuthResponse(token, user.getId(), user.getName(), user.getEmail()));
    }

    // POST /api/auth/login
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest req) {
        if (req.getEmail() == null || req.getPassword() == null)
            return ResponseEntity.badRequest().body(Map.of("error", "Email and password are required"));

        Optional<User> userOpt = userRepo.findByEmail(req.getEmail().toLowerCase().trim());
        if (userOpt.isEmpty())
            return ResponseEntity.status(401).body(Map.of("error", "Invalid email or password"));

        User user = userOpt.get();
        if (!passwordEncoder.matches(req.getPassword(), user.getPassword()))
            return ResponseEntity.status(401).body(Map.of("error", "Invalid email or password"));

        String token = jwtUtil.generateToken(user.getId(), user.getEmail());
        return ResponseEntity.ok(new AuthResponse(token, user.getId(), user.getName(), user.getEmail()));
    }

    // GET /api/auth/me  — verify token + return profile
    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer "))
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        String token = authHeader.substring(7);
        if (!jwtUtil.isValid(token))
            return ResponseEntity.status(401).body(Map.of("error", "Token expired or invalid"));

        Long userId = jwtUtil.getUserId(token);
        return userRepo.findById(userId)
            .<ResponseEntity<?>>map(u -> ResponseEntity.ok(
                new AuthResponse(token, u.getId(), u.getName(), u.getEmail())))
            .orElse(ResponseEntity.status(401).body(Map.of("error", "User not found")));
    }
}
