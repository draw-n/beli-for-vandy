import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navigation } from './components/navigation/navigation';

@Component({
  selector: 'app-root',
  imports: [Navigation, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})

export class App{}   
