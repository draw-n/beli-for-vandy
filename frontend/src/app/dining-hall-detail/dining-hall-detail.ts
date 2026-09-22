import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

interface Review {
  user: string;
  rating: number;
  text: string;
  favoriteDish?: string;
}

interface DiningHall {
  id: string;
  name: string;
  image: string;
  photos: string[];
  rating: number;
  friendRating: number;
  ratingCount: number;
  rank: number;
  location: string;
  tags: string[];
  reviews: Review[];
}

@Component({
  selector: 'app-dining-hall-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dining-hall-detail.html',
  styleUrl: './dining-hall-detail.css',
})
export class DiningHallDetail {
  diningHalls: DiningHall[] = [
    {
      id: 'commons',
      name: 'The Commons Dining Center',
      image: '/assets/commons.jpg',
      photos: ['/assets/commons.jpg', '/assets/commons.jpg'],
      rating: 8.4,
      friendRating: 8.7,
      ratingCount: 126,
      rank: 3,
      location: 'Peabody Campus',
      tags: ['Dining Hall', 'Breakfast', 'Vegetarian', 'Healthy'],
      reviews: [
        {
          user: 'Ashley',
          rating: 8.7,
          text: 'Breakfast is easily the best time to go. The omelet station carries.',
          favoriteDish: 'Omelet',
        },
        {
          user: 'Jack',
          rating: 7.9,
          text: 'Good selection but gets really crowded around noon.',
          favoriteDish: 'Burrito Bowl',
        },
      ],
    },
    {
      id: 'rand',
      name: 'Rand Dining Center',
      image: '/assets/rand.jpg',
      photos: ['/assets/rand.jpg', '/assets/rand.jpg'],
      rating: 8.1,
      friendRating: 8.3,
      ratingCount: 98,
      rank: 4,
      location: 'Central Campus',
      tags: ['Dining Hall', 'Lunch', 'Quick'],
      reviews: [
        {
          user: 'Maya',
          rating: 8.5,
          text: 'Really convenient between classes and usually has a lot of options.',
          favoriteDish: 'Chicken Bowl',
        },
      ],
    },
    {
      id: 'ebi',
      name: 'EBI Dining Center',
      image: '/assets/ebi.jpg',
      photos: ['/assets/ebi.jpg'],
      rating: 7.8,
      friendRating: 8.0,
      ratingCount: 64,
      rank: 6,
      location: 'E. Bronson Ingram',
      tags: ['Dining Hall', 'Dinner'],
      reviews: [
        {
          user: 'Sam',
          rating: 8.0,
          text: 'Great vibe at night, seating can be tough to find though.',
        },
      ],
    },
    {
      id: 'kissam',
      name: 'The Kitchen at Kissam',
      image: '/assets/kissam.webp',
      photos: ['/assets/kissam.webp'],
      rating: 8.2,
      friendRating: 8.5,
      ratingCount: 82,
      rank: 5,
      location: 'Kissam Center',
      tags: ['Comfort Food', 'Hot Bar'],
      reviews: [
        {
          user: 'Chris',
          rating: 8.4,
          text: 'The hot food choices change up nicely and taste fresh.',
          favoriteDish: 'Rotisserie Chicken',
        },
      ],
    },
    {
      id: 'rothschild',
      name: 'Rothschild Dining Center',
      image: '/assets/roth.jpg',
      photos: ['/assets/roth.jpg'],
      rating: 8.5,
      friendRating: 8.8,
      ratingCount: 71,
      rank: 2,
      location: 'Rothschild College',
      tags: ['Modern', 'Dining Hall'],
      reviews: [
        {
          user: 'Taylor',
          rating: 8.9,
          text: 'Clean, new, and the food quality is top-tier for campus.',
          favoriteDish: 'Grain Bowl',
        },
      ],
    },
    {
      id: 'carmichael',
      name: 'Cafe Carmichael',
      image: '/assets/carm.jpg',
      photos: ['/assets/carm.jpg'],
      rating: 7.9,
      friendRating: 8.1,
      ratingCount: 45,
      rank: 7,
      location: 'Moore College',
      tags: ['Cafe', 'Quick Bite'],
      reviews: [
        {
          user: 'Jordan',
          rating: 8.0,
          text: 'Nice spot to grab a quick bite when studying nearby.',
        },
      ],
    },
    {
      id: 'pub',
      name: 'The Pub at Overcup Oak',
      image: '/assets/pub.avif',
      photos: ['/assets/pub.avif'],
      rating: 8.6,
      friendRating: 9.0,
      ratingCount: 110,
      rank: 1,
      location: 'Nicholas Zeppos College',
      tags: ['Dinner', 'Social', 'Burgers'],
      reviews: [
        {
          user: 'Alex',
          rating: 9.1,
          text: 'Best burgers on campus by far. Fun atmosphere in the evenings.',
          favoriteDish: 'Cheeseburger',
        },
      ],
    },
    {
      id: 'zeppos',
      name: 'Zeppos Dining',
      image: '/assets/zeppos.jpg',
      photos: ['/assets/zeppos.jpg'],
      rating: 8.0,
      friendRating: 8.2,
      ratingCount: 55,
      rank: 8,
      location: 'Zeppos Tower',
      tags: ['Dining Hall', 'Dinner'],
      reviews: [
        { user: 'Morgan', rating: 8.1, text: 'Solid rotation of meals and friendly staff.' },
      ],
    },
    {
      id: 'west-end-bagels',
      name: 'West End Bagel Co Production',
      image: '/assets/bagel.jpg',
      photos: ['/assets/bagel.jpg'],
      rating: 8.3,
      friendRating: 8.6,
      ratingCount: 88,
      rank: 9,
      location: 'West End',
      tags: ['Breakfast', 'Bagels', 'Coffee'],
      reviews: [
        {
          user: 'Casey',
          rating: 8.5,
          text: 'Amazing bagels for an early morning rush before an 8 AM class.',
          favoriteDish: 'Everything Bagel with Scallion Cream Cheese',
        },
      ],
    },
    {
      id: 'local-java',
      name: 'Local Java Cafe at Alumni',
      image: '/assets/java.jpg',
      photos: ['/assets/java.jpg'],
      rating: 7.7,
      friendRating: 7.9,
      ratingCount: 39,
      rank: 10,
      location: 'Alumni Hall',
      tags: ['Coffee', 'Snacks'],
      reviews: [
        {
          user: 'Pat',
          rating: 7.8,
          text: 'Solid iced coffee, though lines get long right before the hour.',
        },
      ],
    },
    {
      id: 'vandyblenz',
      name: 'VandyBlenz',
      image: '/assets/blenz.png',
      photos: ['/assets/blenz.png'],
      rating: 8.2,
      friendRating: 8.5,
      ratingCount: 42,
      rank: 11,
      location: 'Student Center',
      tags: ['Smoothies', 'Healthy'],
      reviews: [
        {
          user: 'Jamie',
          rating: 8.6,
          text: 'Refreshing after a workout at the rec center.',
          favoriteDish: 'Berry Smoothie',
        },
      ],
    },
    {
      id: 'wasabi',
      name: 'Wasabi',
      image: '/assets/wasabi.jpg',
      photos: ['/assets/wasabi.jpg'],
      rating: 7.9,
      friendRating: 8.0,
      ratingCount: 77,
      rank: 12,
      location: 'Rand Yard',
      tags: ['Sushi', 'Asian'],
      reviews: [
        {
          user: 'Avery',
          rating: 8.0,
          text: 'Good grab-and-go sushi rolls when you are tired of standard dining hall food.',
        },
      ],
    },
    {
      id: 'suzies',
      name: 'Suzies',
      image: '/assets/suzies.jpg',
      photos: ['/assets/suzies.jpg'],
      rating: 8.1,
      friendRating: 8.4,
      ratingCount: 91,
      rank: 13,
      location: 'Various Locations',
      tags: ['Coffee', 'Snacks', 'Quick'],
      reviews: [
        {
          user: 'Riley',
          rating: 8.2,
          text: 'Lifesaver for a quick snack or pastry between classes.',
        },
      ],
    },
    {
      id: 'holy-smokes',
      name: 'Holy Smokes Kosher Food Truck',
      image: '/assets/holysmokes.png',
      photos: ['/assets/holysmokes.png'],
      rating: 9.2,
      friendRating: 9.5,
      ratingCount: 140,
      rank: 14,
      location: 'Central Campus',
      tags: ['Food Truck', 'Kosher', 'BBQ'],
      reviews: [
        {
          user: 'Eli',
          rating: 9.5,
          text: 'Incredible brisket and portions. Worth every single meal swipe.',
          favoriteDish: 'Brisket Sandwich',
        },
      ],
    },
  ];

  hall?: DiningHall;

  constructor(private route: ActivatedRoute) {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.hall = this.diningHalls.find((hall) => String(hall.id) === idParam);
  }
}
