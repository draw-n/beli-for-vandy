# BeliForVandyFrontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.24.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Review form integration

The location review dialog submits to `POST http://localhost:8000/reviews/`.
It uses the signed-in `currentAccount.uuid` for `user_id` and the current location UUID
for `location_id`. Rating is a whole number from 1–10; review text maps to `note`,
and the selected meal maps to `meal_type`. Both timestamps are generated as ISO
strings at submission. `photo_ids` is empty while photo uploads are unavailable.
The dialog stays open on errors, prevents duplicate submissions while saving, and
refreshes the location's reviews, count, and average rating after a successful save.
This connects creation to the existing read flow; editing/deleting reviews has no UI yet.

Reviews matching the signed-in account show a vertical three-dot menu with **Edit review**.
Editing reuses the form and calls `PUT /reviews/{review_id}` with `rating`, `note`,
`meal_type`, and `updated_at`; author, location, creation time, and photo IDs are preserved.
The list and average refresh after saving. Ownership is checked in the UI only;
the existing backend does not authenticate review updates. The profile still displays
account details only, without a review list.

### Reusing review items

`ReviewItem` (`app-review-item`) renders an individual review and its optional edit
menu. Pass a typed `Review` through `[review]`, an ownership decision through
`[canEdit]` (defaults to false), and handle `(editRequested)` in the containing page.
The component has no route, session-storage, dialog, or HTTP dependencies; the page
owns fetching, authentication context, editing, and refreshing. Its styles are
encapsulated, so the same item can be used in a future profile review list.

```html
<app-review-item
  [review]="review"
  [canEdit]="isOwnReview(review)"
  (editRequested)="openReviewDialog($event)"
/>
```

The review menu offers **Edit** (pencil) and **Delete** (trash). `deleteRequested`
emits the selected review; the dining hall page calls `DELETE /reviews/{review_id}`.
The review is removed from the displayed list only after the API succeeds, and the
count and average are recalculated. Failed deletions preserve the review and show
an error for retry. The `busy` input disables menu actions while deletion is pending.
