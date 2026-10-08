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
          renderMode: RenderMode.Prerender,
        },
        {
          path: 'locations/:id',
          renderMode: RenderMode.Server,
        },
        {
          path: 'profile',
          renderMode: RenderMode.Prerender,
        },
        {
          path: '**',
          renderMode: RenderMode.Server,
        },
      ]),
    ),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
