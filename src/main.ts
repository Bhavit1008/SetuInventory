import { bootstrapApplication } from '@angular/platform-browser';
import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideEchartsCore } from 'ngx-echarts';

import * as echarts from 'echarts';

// Client-only extras layered on top of the shared appConfig (router, HTTP
// client + interceptors, hydration, etc.) — mirrors how app.config.server.ts
// merges the same appConfig with its own server-only providers, so the
// router/HttpClient/interceptor setup can't silently diverge between the
// two bootstrap entry points again.
const clientConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    provideEchartsCore({ echarts })
  ]
};

bootstrapApplication(AppComponent, mergeApplicationConfig(appConfig, clientConfig))
  .catch(err => console.error(err));