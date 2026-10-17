import { locationCoverImage } from './location-cover-image';

describe('locationCoverImage', () => {
  it('maps each seeded dining location to its matching local cover asset', () => {
    const mappings: Record<string, string> = {
      '650408b4-bf68-11f1-a035-00155de17b17': '/assets/commons.jpg',
      '71497d48-bf68-11f1-b291-00155de17b17': '/assets/rand.jpg',
      '77b5928e-bf68-11f1-b446-00155de17b17': '/assets/ebi.jpg',
      '7eb57842-bf68-11f1-91cd-00155de17b17': '/assets/kissam.webp',
      '84fea8e0-bf68-11f1-bf87-00155de17b17': '/assets/roth.jpg',
      '8ac38d2c-bf68-11f1-8280-00155de17b17': '/assets/carm.jpg',
      '9042d4c4-bf68-11f1-8d0a-00155de17b17': '/assets/pub.avif',
      '94caa936-bf68-11f1-a27b-00155de17b17': '/assets/zeppos.jpg',
      '99b8727a-bf68-11f1-b6fa-00155de17b17': '/assets/bagel.jpg',
      '9e7fff76-bf68-11f1-a0fa-00155de17b17': '/assets/java.jpg',
      'a7e7ebaa-bf68-11f1-ab13-00155de17b17': '/assets/blenz.png',
      'ab7be104-bf68-11f1-ad63-00155de17b17': '/assets/wasabi.jpg',
      'b02c17fa-bf68-11f1-ab42-00155de17b17': '/assets/suzies.jpg',
      'b58fd57e-bf68-11f1-89c9-00155de17b17': '/assets/holysmokes.png',
    };

    for (const [locationId, imagePath] of Object.entries(mappings)) {
      expect(locationCoverImage(locationId)).toBe(imagePath);
    }
  });

  it('returns no image for an unmapped location', () => {
    expect(locationCoverImage('unknown-location')).toBeUndefined();
  });
});
