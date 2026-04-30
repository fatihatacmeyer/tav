import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { isDevMode } from '@angular/core';

if (!isDevMode()) {
  window.console.log = function () {};
  window.console.warn = function () {};
  window.console.info = function () {};
  window.console.debug = function () {};
  
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));


