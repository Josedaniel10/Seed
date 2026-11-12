import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthLayout } from '../../../layouts/AuthLayout.tsx';
import { LoginPage } from '../../../pages/auth/LoginPage.tsx';
import { RegistroPage } from '../../../pages/auth/RegistroPage.tsx';

function renderAuthPage(path, page) {
  return renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [path] },
    React.createElement(Routes, null,
      React.createElement(Route, { element: React.createElement(AuthLayout) },
        React.createElement(Route, { path, element: React.createElement(page) })))));
}

test('registration entry renders the brand and only the first step of the form', () => {
  const markup = renderAuthPage('/registro', RegistroPage);
  assert.match(markup, /Seed, inicio/);
  assert.match(markup, /Paso 1 de 3/);
  assert.match(markup, /id="register-name"/);
  assert.match(markup, /id="register-email"/);
  assert.doesNotMatch(markup, /id="register-password"|id="register-program"|id="register-group"/);
  assert.match(markup, /Continuar/);
});

test('login entry renders the presentation and password-manager-compatible fields', () => {
  const markup = renderAuthPage('/login', LoginPage);
  assert.match(markup, /Las grandes ideas/);
  assert.match(markup, /Bienvenido a Seed/);
  assert.match(markup, /autoComplete="username"/);
  assert.match(markup, /autoComplete="current-password"/);
  assert.match(markup, /Mostrar contraseña/);
  assert.match(markup, /href="\/registro"/);
});
