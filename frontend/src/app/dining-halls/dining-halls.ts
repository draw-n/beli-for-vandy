import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';

interface DiningHours {
  day: string;
  openTime: string;
  closeTime: string;
}

interface DiningHall {
  uuid: string;
  name: string;
  location: string;
  tags: string[];
  hours: DiningHours[];
  averageRating: number;
  reviewCount: number;
  image?: string;
}

@Component({
  selector: 'app-dining-halls',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatChipsModule,
  ],
  templateUrl: './dining-halls.html',
  styleUrl: './dining-halls.css',
})
export class DiningHalls {
  searchTerm = '';

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
      averageRating: 8.3,
      reviewCount: 126,
      image: '/assets/commons.jpg',
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
      reviewCount: 98,
      image: '/assets/rand.jpg',
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
      reviewCount: 64,
      image: '/assets/ebi.jpg',
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
      reviewCount: 82,
      image: '/assets/kissam.webp',
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
      reviewCount: 71,
      image: '/assets/roth.jpg',
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
      reviewCount: 45,
      image: '/assets/carm.jpg',
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
      reviewCount: 110,
      image: '/assets/pub.avif',
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
      reviewCount: 55,
      image: '/assets/zeppos.jpg',
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
      reviewCount: 88,
      image: '/assets/bagel.jpg',
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
      reviewCount: 39,
      image: '/assets/java.jpg',
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
      reviewCount: 42,
      image: '/assets/blenz.png',
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
      reviewCount: 77,
      image: '/assets/wasabi.jpg',
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
      reviewCount: 91,
      image: '/assets/suzies.jpg',
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
      reviewCount: 140,
      image: '/assets/holysmokes.png',
    },
  ];

  get filteredDiningHalls(): DiningHall[] {
    const search = this.searchTerm.toLowerCase().trim();

    return this.diningHalls
      .filter((hall) => {
        return (
          hall.name.toLowerCase().includes(search) ||
          hall.location.toLowerCase().includes(search) ||
          hall.tags.some((tag) => tag.toLowerCase().includes(search))
        );
      })
      .sort((a, b) => b.averageRating - a.averageRating);
  }

  getTodayHours(hall: DiningHall): DiningHours | undefined {
    const today = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
    }).format(new Date());

    return hall.hours.find((hours) => hours.day === today);
  }
}
