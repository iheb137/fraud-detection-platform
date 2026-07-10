package com.tunisietelecom.frauddetection.controller;

import com.tunisietelecom.frauddetection.domain.entity.User;
import com.tunisietelecom.frauddetection.domain.enums.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Tests de la resolution de perimetre (decision d architecture n1 :
 * isolation par role, un seul chemin de code IN (:userIds)).
 */
class StatisticsControllerScopeTest {

    private StatisticsController controller;

    @BeforeEach
    void setUp() {
        controller = new StatisticsController(null, null, null, null);
    }

    private User userWithRole(Role role, Long id) {
        User u = mock(User.class);
        when(u.getRole()).thenReturn(role);
        when(u.getId()).thenReturn(id);
        return u;
    }

    @Test
    @DisplayName("ADMIN : toujours restreint a ses donnees, adminIds ignore (securite)")
    void adminIgnoreAdminIds() {
        User admin = userWithRole(Role.ADMIN, 7L);
        assertThat(controller.resolveScope(admin, List.of(1L, 2L))).containsExactly(7L);
        assertThat(controller.resolveScope(admin, null)).containsExactly(7L);
    }

    @Test
    @DisplayName("ANALYSTE + selection : perimetre = la selection")
    void analysteAvecScope() {
        User analyste = userWithRole(Role.ANALYSTE, 3L);
        assertThat(controller.resolveScope(analyste, List.of(1L, 5L))).containsExactly(1L, 5L);
    }

    @Test
    @DisplayName("ANALYSTE sans selection (null ou vide) : global = null")
    void analysteSansScopeEstGlobal() {
        User analyste = userWithRole(Role.ANALYSTE, 3L);
        assertThat(controller.resolveScope(analyste, null)).isNull();
        assertThat(controller.resolveScope(analyste, Collections.emptyList())).isNull();
    }

    @Test
    @DisplayName("SUPERADMIN : traite comme non-ADMIN (global par defaut)")
    void superadminEstGlobalParDefaut() {
        User superadmin = userWithRole(Role.SUPERADMIN, 2L);
        assertThat(controller.resolveScope(superadmin, null)).isNull();
    }
}