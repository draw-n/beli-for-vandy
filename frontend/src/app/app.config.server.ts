import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, RenderMode, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(
      withRoutes([
        {
          path: '',
          renderMode: RenderMode.Prerender,
        },
        {
          path: 'login',
          renderMode: RenderMode.Prerender,
        },
        {
          path: 'register',
          renderMode: RenderMode.Prerender,
        },
        {
          path: 'locations',
          renderMode: RenderMode.Client,
        },
        {
          path: 'locations/:id',
          renderMode: RenderMode.Client,
        },
        {
          path: 'profile',
          renderMode: RenderMode.Prerender,
        },
        {
          path: '**',
          renderMode: RenderMode.Client,
        },
      ]),
    ),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
