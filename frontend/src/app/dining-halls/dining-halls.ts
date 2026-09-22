import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface DiningHall {
  id: string;
  name: string;
  image: string;
  rating: number;
}

@Component({
  selector: 'app-dining-halls',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dining-halls.html',
  styleUrl: './dining-halls.css',
})
export class DiningHalls {
  searchTerm = '';

  diningHalls: DiningHall[] = [
    {
      id: 'commons',
      name: 'The Commons Dining Center',
      image: '/assets/commons.jpg',
      rating: 4,
    },
    {
      id: 'rand',
      name: 'Rand Dining Center',
      image: '/assets/rand.jpg',
      rating: 4,
    },
    {
      id: 'ebi',
      name: 'EBI Dining Center',
      image: '/assets/ebi.jpg',
      rating: 4,
    },
    {
      id: 'kissam',
      name: 'The Kitchen at Kissam',
      image: '/assets/kissam.webp',
      rating: 4,
    },
    {
      id: 'rothschild',
      name: 'Rothschild Dining Center',
      image: '/assets/roth.jpg',
      rating: 4,
    },
    {
      id: 'carmichael',
      name: 'Cafe Carmichael',
      image: '/assets/carm.jpg',
      rating: 4,
    },
    {
      id: 'pub',
      name: 'The Pub at Overcup Oak',
      image: '/assets/pub.avif',
      rating: 4,
    },
    {
      id: 'zeppos',
      name: 'Zeppos Dining',
      image: '/assets/zeppos.jpg',
      rating: 4,
    },
    {
      id: 'west-end-bagels',
      name: 'West End Bagel Co Production',
      image: '/assets/bagel.jpg',
      rating: 4,
    },
    {
      id: 'local-java',
      name: 'Local Java Cafe at Alumni',
      image: '/assets/java.jpg',
      rating: 4,
    },
    {
      id: 'vandyblenz',
      name: 'VandyBlenz',
      image: '/assets/blenz.png',
      rating: 4,
    },
    {
      id: 'wasabi',
      name: 'Wasabi',
      image: '/assets/wasabi.jpg',
      rating: 4,
    },
    {
      id: 'suzies',
      name: 'Suzies',
      image: '/assets/suzies.jpg',
      rating: 4,
    },
    {
      id: 'holy-smokes',
      name: 'Holy Smokes Kosher Food Truck',
      image: '/assets/holysmokes.png',
      rating: 5,
    },
  ];

  get filteredDiningHalls(): DiningHall[] {
    const search = this.searchTerm.toLowerCase().trim();

    return this.diningHalls
      .filter((hall) => hall.name.toLowerCase().includes(search))
      .sort((a, b) => b.rating - a.rating);
  }
}
