import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { RateReviewDialog, ReviewFormResult } from '../rate-review-dialog/rate-review-dialog';

interface DiningHours {
  day: string;
  openTime: string;
  closeTime: string;
}

interface Review {
  uuid: string;
  userId: string;
  diningHallId: string;
  rating: number;
  reviewText: string;
  mealType: string;
  createdAt: Date;
  updatedAt: Date;
  photoIds?: string[];
}

interface DiningHall {
  uuid: string;
  name: string;
  location: string;
  tags: string[];
  hours: DiningHours[];

  averageRating: number;

  // Average from reviews written by the current user's friends
  friendRating: number | null;

  reviewCount: number;

  // Temporary frontend fields
  image?: string;
  photos?: string[];

  // Temporary mocked relationship
  reviews: Review[];
}

@Component({
  selector: 'app-dining-hall-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatIconModule,
    MatDialogModule,
  ],
  templateUrl: './dining-hall-detail.html',
  styleUrl: './dining-hall-detail.css',
})
export class DiningHallDetail {
  diningHalls: DiningHall[] = [
    {
      uuid: 'commons',
      name: 'The Commons Dining Center',
      location: 'Peabody Campus',
      tags: ['All You Can Eat'],
      hours: [
        { day: 'Monday', openTime: '7:00 AM', closeTime: '9:00 PM' },
        { day: 'Tuesday', openTime: '7:00 AM', closeTime: '9:00 PM' },
        { day: 'Wednesday', openTime: '7:00 AM', closeTime: '9:00 PM' },
        { day: 'Thursday', openTime: '7:00 AM', closeTime: '9:00 PM' },
        { day: 'Friday', openTime: '7:00 AM', closeTime: '8:00 PM' },
        { day: 'Saturday', openTime: '9:00 AM', closeTime: '8:00 PM' },
        { day: 'Sunday', openTime: '9:00 AM', closeTime: '9:00 PM' },
      ],
      averageRating: 8.4,
      friendRating: 8.7,
      reviewCount: 126,
      image: '/assets/commons.jpg',
      photos: ['/assets/commons.jpg', '/assets/commons.jpg'],
      reviews: [
        {
          uuid: 'review-commons-1',
          userId: 'Ashley',
          diningHallId: 'commons',
          rating: 8.7,
          reviewText: 'Breakfast is easily the best time to go. The omelet station carries.',
          mealType: 'Breakfast',
          createdAt: new Date('2026-09-20'),
          updatedAt: new Date('2026-09-20'),
        },
        {
          uuid: 'review-commons-2',
          userId: 'Jack',
          diningHallId: 'commons',
          rating: 7.9,
          reviewText: 'Good selection but gets really crowded around noon.',
          mealType: 'Lunch',
          createdAt: new Date('2026-09-18'),
          updatedAt: new Date('2026-09-18'),
        },
      ],
    },

    {
      uuid: 'rand',
      name: 'Rand Dining Center',
      location: 'Rand Hall',
      tags: ['Meals'],
      hours: [
        { day: 'Monday', openTime: '7:30 AM', closeTime: '8:00 PM' },
        { day: 'Tuesday', openTime: '7:30 AM', closeTime: '8:00 PM' },
        { day: 'Wednesday', openTime: '7:30 AM', closeTime: '8:00 PM' },
        { day: 'Thursday', openTime: '7:30 AM', closeTime: '8:00 PM' },
        { day: 'Friday', openTime: '7:30 AM', closeTime: '7:00 PM' },
        { day: 'Saturday', openTime: '10:00 AM', closeTime: '6:00 PM' },
        { day: 'Sunday', openTime: '10:00 AM', closeTime: '6:00 PM' },
      ],
      averageRating: 8.1,
      friendRating: 8.3,
      reviewCount: 98,
      image: '/assets/rand.jpg',
      photos: ['/assets/rand.jpg'],
      reviews: [
        {
          uuid: 'review-rand-1',
          userId: 'Maya',
          diningHallId: 'rand',
          rating: 8.5,
          reviewText: 'Really convenient between classes and usually has a lot of options.',
          mealType: 'Lunch',
          createdAt: new Date('2026-09-19'),
          updatedAt: new Date('2026-09-19'),
        },
      ],
    },

    {
      uuid: 'ebi',
      name: 'EBI Dining Center',
      location: 'E. Bronson Ingram College',
      tags: ['All You Can Eat'],
      hours: [
        { day: 'Monday', openTime: '7:00 AM', closeTime: '9:00 PM' },
        { day: 'Tuesday', openTime: '7:00 AM', closeTime: '9:00 PM' },
        { day: 'Wednesday', openTime: '7:00 AM', closeTime: '9:00 PM' },
        { day: 'Thursday', openTime: '7:00 AM', closeTime: '9:00 PM' },
        { day: 'Friday', openTime: '7:00 AM', closeTime: '8:00 PM' },
        { day: 'Saturday', openTime: '9:00 AM', closeTime: '8:00 PM' },
        { day: 'Sunday', openTime: '9:00 AM', closeTime: '8:00 PM' },
      ],
      averageRating: 7.8,
      friendRating: 8.0,
      reviewCount: 64,
      image: '/assets/ebi.jpg',
      photos: ['/assets/ebi.jpg'],
      reviews: [
        {
          uuid: 'review-ebi-1',
          userId: 'Sam',
          diningHallId: 'ebi',
          rating: 8.0,
          reviewText: 'Great vibe at night, seating can be tough to find though.',
          mealType: 'Dinner',
          createdAt: new Date('2026-09-17'),
          updatedAt: new Date('2026-09-17'),
        },
      ],
    },

    {
      uuid: 'kissam',
      name: 'The Kitchen at Kissam',
      location: 'Kissam Center',
      tags: ['Meals'],
      hours: [
        { day: 'Monday', openTime: '11:00 AM', closeTime: '8:00 PM' },
        { day: 'Tuesday', openTime: '11:00 AM', closeTime: '8:00 PM' },
        { day: 'Wednesday', openTime: '11:00 AM', closeTime: '8:00 PM' },
        { day: 'Thursday', openTime: '11:00 AM', closeTime: '8:00 PM' },
        { day: 'Friday', openTime: '11:00 AM', closeTime: '7:00 PM' },
      ],
      averageRating: 8.2,
      friendRating: 8.5,
      reviewCount: 82,
      image: '/assets/kissam.webp',
      photos: ['/assets/kissam.webp'],
      reviews: [
        {
          uuid: 'review-kissam-1',
          userId: 'Chris',
          diningHallId: 'kissam',
          rating: 8.4,
          reviewText: 'The hot food choices change up nicely and taste fresh.',
          mealType: 'Dinner',
          createdAt: new Date('2026-09-16'),
          updatedAt: new Date('2026-09-16'),
        },
      ],
    },

    {
      uuid: 'rothschild',
      name: 'Rothschild Dining Center',
      location: 'Rothschild College',
      tags: ['All You Can Eat'],
      hours: [
        { day: 'Monday', openTime: '7:00 AM', closeTime: '9:00 PM' },
        { day: 'Tuesday', openTime: '7:00 AM', closeTime: '9:00 PM' },
        { day: 'Wednesday', openTime: '7:00 AM', closeTime: '9:00 PM' },
        { day: 'Thursday', openTime: '7:00 AM', closeTime: '9:00 PM' },
        { day: 'Friday', openTime: '7:00 AM', closeTime: '8:00 PM' },
        { day: 'Saturday', openTime: '9:00 AM', closeTime: '8:00 PM' },
        { day: 'Sunday', openTime: '9:00 AM', closeTime: '8:00 PM' },
      ],
      averageRating: 8.5,
      friendRating: 8.8,
      reviewCount: 71,
      image: '/assets/roth.jpg',
      photos: ['/assets/roth.jpg'],
      reviews: [
        {
          uuid: 'review-roth-1',
          userId: 'Taylor',
          diningHallId: 'rothschild',
          rating: 8.9,
          reviewText: 'Clean, new, and the food quality is top-tier for campus.',
          mealType: 'Lunch',
          createdAt: new Date('2026-09-15'),
          updatedAt: new Date('2026-09-15'),
        },
      ],
    },

    {
      uuid: 'carmichael',
      name: 'Cafe Carmichael',
      location: 'Carmichael College',
      tags: ['Meals'],
      hours: [
        { day: 'Monday', openTime: '8:00 AM', closeTime: '5:00 PM' },
        { day: 'Tuesday', openTime: '8:00 AM', closeTime: '5:00 PM' },
        { day: 'Wednesday', openTime: '8:00 AM', closeTime: '5:00 PM' },
        { day: 'Thursday', openTime: '8:00 AM', closeTime: '5:00 PM' },
        { day: 'Friday', openTime: '8:00 AM', closeTime: '3:00 PM' },
      ],
      averageRating: 7.9,
      friendRating: 8.1,
      reviewCount: 45,
      image: '/assets/carm.jpg',
      photos: ['/assets/carm.jpg'],
      reviews: [
        {
          uuid: 'review-carmichael-1',
          userId: 'Jordan',
          diningHallId: 'carmichael',
          rating: 8.0,
          reviewText: 'Nice spot to grab a quick bite when studying nearby.',
          mealType: 'Snack',
          createdAt: new Date('2026-09-14'),
          updatedAt: new Date('2026-09-14'),
        },
      ],
    },

    {
      uuid: 'pub',
      name: 'The Pub at Overcup Oak',
      location: 'Rand Hall',
      tags: ['Meals'],
      hours: [
        { day: 'Monday', openTime: '11:00 AM', closeTime: '10:00 PM' },
        { day: 'Tuesday', openTime: '11:00 AM', closeTime: '10:00 PM' },
        { day: 'Wednesday', openTime: '11:00 AM', closeTime: '10:00 PM' },
        { day: 'Thursday', openTime: '11:00 AM', closeTime: '10:00 PM' },
        { day: 'Friday', openTime: '11:00 AM', closeTime: '11:00 PM' },
        { day: 'Saturday', openTime: '12:00 PM', closeTime: '11:00 PM' },
        { day: 'Sunday', openTime: '12:00 PM', closeTime: '9:00 PM' },
      ],
      averageRating: 8.6,
      friendRating: 9.0,
      reviewCount: 110,
      image: '/assets/pub.avif',
      photos: ['/assets/pub.avif'],
      reviews: [
        {
          uuid: 'review-pub-1',
          userId: 'Alex',
          diningHallId: 'pub',
          rating: 9.1,
          reviewText: 'Best burgers on campus by far. Fun atmosphere in the evenings.',
          mealType: 'Dinner',
          createdAt: new Date('2026-09-13'),
          updatedAt: new Date('2026-09-13'),
        },
      ],
    },

    {
      uuid: 'zeppos',
      name: 'Zeppos Dining',
      location: 'Zeppos College',
      tags: ['All You Can Eat'],
      hours: [
        { day: 'Monday', openTime: '7:00 AM', closeTime: '9:00 PM' },
        { day: 'Tuesday', openTime: '7:00 AM', closeTime: '9:00 PM' },
        { day: 'Wednesday', openTime: '7:00 AM', closeTime: '9:00 PM' },
        { day: 'Thursday', openTime: '7:00 AM', closeTime: '9:00 PM' },
        { day: 'Friday', openTime: '7:00 AM', closeTime: '8:00 PM' },
        { day: 'Saturday', openTime: '9:00 AM', closeTime: '8:00 PM' },
        { day: 'Sunday', openTime: '9:00 AM', closeTime: '8:00 PM' },
      ],
      averageRating: 8.0,
      friendRating: 8.2,
      reviewCount: 55,
      image: '/assets/zeppos.jpg',
      photos: ['/assets/zeppos.jpg'],
      reviews: [
        {
          uuid: 'review-zeppos-1',
          userId: 'Morgan',
          diningHallId: 'zeppos',
          rating: 8.1,
          reviewText: 'Solid rotation of meals and friendly staff.',
          mealType: 'Dinner',
          createdAt: new Date('2026-09-12'),
          updatedAt: new Date('2026-09-12'),
        },
      ],
    },

    {
      uuid: 'west-end-bagels',
      name: 'West End Bagel Co Production',
      location: 'West End',
      tags: ['Meals'],
      hours: [
        { day: 'Monday', openTime: '7:00 AM', closeTime: '3:00 PM' },
        { day: 'Tuesday', openTime: '7:00 AM', closeTime: '3:00 PM' },
        { day: 'Wednesday', openTime: '7:00 AM', closeTime: '3:00 PM' },
        { day: 'Thursday', openTime: '7:00 AM', closeTime: '3:00 PM' },
        { day: 'Friday', openTime: '7:00 AM', closeTime: '3:00 PM' },
      ],
      averageRating: 8.3,
      friendRating: 8.6,
      reviewCount: 88,
      image: '/assets/bagel.jpg',
      photos: ['/assets/bagel.jpg'],
      reviews: [
        {
          uuid: 'review-bagel-1',
          userId: 'Casey',
          diningHallId: 'west-end-bagels',
          rating: 8.5,
          reviewText: 'Amazing bagels for an early morning rush before an 8 AM class.',
          mealType: 'Breakfast',
          createdAt: new Date('2026-09-11'),
          updatedAt: new Date('2026-09-11'),
        },
      ],
    },

    {
      uuid: 'local-java',
      name: 'Local Java Cafe at Alumni',
      location: 'Alumni Hall',
      tags: ['Meals'],
      hours: [
        { day: 'Monday', openTime: '7:30 AM', closeTime: '5:00 PM' },
        { day: 'Tuesday', openTime: '7:30 AM', closeTime: '5:00 PM' },
        { day: 'Wednesday', openTime: '7:30 AM', closeTime: '5:00 PM' },
        { day: 'Thursday', openTime: '7:30 AM', closeTime: '5:00 PM' },
        { day: 'Friday', openTime: '7:30 AM', closeTime: '4:00 PM' },
      ],
      averageRating: 7.7,
      friendRating: 7.9,
      reviewCount: 39,
      image: '/assets/java.jpg',
      photos: ['/assets/java.jpg'],
      reviews: [
        {
          uuid: 'review-java-1',
          userId: 'Pat',
          diningHallId: 'local-java',
          rating: 7.8,
          reviewText: 'Solid iced coffee, though lines get long right before the hour.',
          mealType: 'Snack',
          createdAt: new Date('2026-09-10'),
          updatedAt: new Date('2026-09-10'),
        },
      ],
    },

    {
      uuid: 'vandyblenz',
      name: 'VandyBlenz',
      location: 'Rand Hall',
      tags: ['Meals'],
      hours: [
        { day: 'Monday', openTime: '8:00 AM', closeTime: '7:00 PM' },
        { day: 'Tuesday', openTime: '8:00 AM', closeTime: '7:00 PM' },
        { day: 'Wednesday', openTime: '8:00 AM', closeTime: '7:00 PM' },
        { day: 'Thursday', openTime: '8:00 AM', closeTime: '7:00 PM' },
        { day: 'Friday', openTime: '8:00 AM', closeTime: '5:00 PM' },
      ],
      averageRating: 8.2,
      friendRating: 8.5,
      reviewCount: 42,
      image: '/assets/blenz.png',
      photos: ['/assets/blenz.png'],
      reviews: [
        {
          uuid: 'review-blenz-1',
          userId: 'Jamie',
          diningHallId: 'vandyblenz',
          rating: 8.6,
          reviewText: 'Refreshing after a workout at the rec center.',
          mealType: 'Snack',
          createdAt: new Date('2026-09-09'),
          updatedAt: new Date('2026-09-09'),
        },
      ],
    },

    {
      uuid: 'wasabi',
      name: 'Wasabi',
      location: 'Rand Hall',
      tags: ['Meals'],
      hours: [
        { day: 'Monday', openTime: '11:00 AM', closeTime: '8:00 PM' },
        { day: 'Tuesday', openTime: '11:00 AM', closeTime: '8:00 PM' },
        { day: 'Wednesday', openTime: '11:00 AM', closeTime: '8:00 PM' },
        { day: 'Thursday', openTime: '11:00 AM', closeTime: '8:00 PM' },
        { day: 'Friday', openTime: '11:00 AM', closeTime: '7:00 PM' },
      ],
      averageRating: 7.9,
      friendRating: 8.0,
      reviewCount: 77,
      image: '/assets/wasabi.jpg',
      photos: ['/assets/wasabi.jpg'],
      reviews: [
        {
          uuid: 'review-wasabi-1',
          userId: 'Avery',
          diningHallId: 'wasabi',
          rating: 8.0,
          reviewText:
            'Good grab-and-go sushi rolls when you are tired of standard dining hall food.',
          mealType: 'Lunch',
          createdAt: new Date('2026-09-08'),
          updatedAt: new Date('2026-09-08'),
        },
      ],
    },

    {
      uuid: 'suzies',
      name: 'Suzies',
      location: 'Various Locations',
      tags: ['Meals'],
      hours: [
        { day: 'Monday', openTime: '7:30 AM', closeTime: '5:00 PM' },
        { day: 'Tuesday', openTime: '7:30 AM', closeTime: '5:00 PM' },
        { day: 'Wednesday', openTime: '7:30 AM', closeTime: '5:00 PM' },
        { day: 'Thursday', openTime: '7:30 AM', closeTime: '5:00 PM' },
        { day: 'Friday', openTime: '7:30 AM', closeTime: '4:00 PM' },
      ],
      averageRating: 8.1,
      friendRating: 8.4,
      reviewCount: 91,
      image: '/assets/suzies.jpg',
      photos: ['/assets/suzies.jpg'],
      reviews: [
        {
          uuid: 'review-suzies-1',
          userId: 'Riley',
          diningHallId: 'suzies',
          rating: 8.2,
          reviewText: 'Lifesaver for a quick snack or pastry between classes.',
          mealType: 'Snack',
          createdAt: new Date('2026-09-07'),
          updatedAt: new Date('2026-09-07'),
        },
      ],
    },

    {
      uuid: 'holy-smokes',
      name: 'Holy Smokes Kosher Food Truck',
      location: 'Central Campus',
      tags: ['Meals'],
      hours: [
        { day: 'Monday', openTime: '11:00 AM', closeTime: '7:00 PM' },
        { day: 'Tuesday', openTime: '11:00 AM', closeTime: '7:00 PM' },
        { day: 'Wednesday', openTime: '11:00 AM', closeTime: '7:00 PM' },
        { day: 'Thursday', openTime: '11:00 AM', closeTime: '7:00 PM' },
      ],
      averageRating: 9.2,
      friendRating: 9.5,
      reviewCount: 140,
      image: '/assets/holysmokes.png',
      photos: ['/assets/holysmokes.png'],
      reviews: [
        {
          uuid: 'review-holy-smokes-1',
          userId: 'Eli',
          diningHallId: 'holy-smokes',
          rating: 9.5,
          reviewText: 'Incredible brisket and portions. Worth every single meal swipe.',
          mealType: 'Lunch',
          createdAt: new Date('2026-09-06'),
          updatedAt: new Date('2026-09-06'),
        },
      ],
    },
  ];

  hall?: DiningHall;

  constructor(
    private route: ActivatedRoute,
    private dialog: MatDialog,
  ) {
    const uuid = this.route.snapshot.paramMap.get('id');

    this.hall = this.diningHalls.find((hall) => hall.uuid === uuid);
  }

  openReviewDialog(): void {
    if (!this.hall) {
      return;
    }

    const dialogRef = this.dialog.open(RateReviewDialog, {
      width: '500px',
      maxWidth: '95vw',
      data: {
        diningHallId: this.hall.uuid,
        diningHallName: this.hall.name,
      },
    });

    dialogRef.afterClosed().subscribe((result: ReviewFormResult | undefined) => {
      if (!result || !this.hall) {
        return;
      }

      console.log('Review form result:', result);
      console.log('Dining hall:', this.hall.uuid);
      console.log('Photos:', result.photos);

      // Later:
      // 1. Upload photos to backend
      // 2. Backend creates Photo records
      // 3. Get photo UUIDs
      // 4. POST the Review to backend
      // 5. Backend recalculates averageRating/reviewCount
      // 6. Refresh/re-fetch this dining hall
    });
  }
}
