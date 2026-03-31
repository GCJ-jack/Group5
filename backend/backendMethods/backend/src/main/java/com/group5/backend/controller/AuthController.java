package com.group5.backend.controller;

import com.group5.backend.model.entity.User;
import com.group5.backend.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RequestMapping("/api/auth")
@RestController
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/login")
    public ResponseEntity<User> login(@RequestBody User user) {

        User foundUser = userService.findByEmail(user.getEmail(), user.getPassword());

        return new ResponseEntity<>(foundUser, HttpStatus.OK);
    }
}
