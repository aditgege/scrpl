'use strict';

export const ACC='#C7522A', INK='#2A2118';

export const SIZES={
  square:{w:1080,h:1080,label:'1:1'},
  portrait:{w:1080,h:1350,label:'4:5'},
  classic:{w:1080,h:1440,label:'3:4'},
  print:{w:1080,h:1620,label:'2:3'},
  tall:{w:1080,h:1920,label:'9:16'},
  landscape:{w:1350,h:1080,label:'5:4'},
  photo:{w:1620,h:1080,label:'3:2'},
  wide:{w:1920,h:1080,label:'16:9'}
};

export const FONTS=[
  {name:'Caveat',css:'"Caveat"',weight:600},
  {name:'Special Elite',css:'"Special Elite"',weight:400},
  {name:'Instrument Serif',css:'"Instrument Serif"',weight:400},
  {name:'IBM Plex Mono',css:'"IBM Plex Mono"',weight:500},
  {name:'Space Grotesk',css:'"Space Grotesk"',weight:500},
  {name:'Playfair Display',css:'"Playfair Display"',weight:700},
  {name:'DM Serif Display',css:'"DM Serif Display"',weight:400},
  {name:'Bebas Neue',css:'"Bebas Neue"',weight:400},
  {name:'Libre Baskerville',css:'"Libre Baskerville"',weight:400},
  {name:'Archivo',css:'"Archivo"',weight:600},
  {name:'Italiana',css:'"Italiana"',weight:400},
  {name:'Inter Tight',css:'"Inter Tight"',weight:800},
  {name:'Anton',css:'"Anton"',weight:400},
  {name:'Archivo Black',css:'"Archivo Black"',weight:400}
];

export const PALETTE=['#F7F2E7','#EFE7D8','#E4D9C3','#D9C9A8','#C9B08A','#B9552F','#8A3B2B','#C7522A','#2B2620','#6E6759'];

export const MASKS=['none','rounded','polaroid','stamp','torn','film','circle','organic'];

export const PADDEF={none:0,rounded:0,polaroid:26,stamp:22,torn:16,film:30,circle:14,organic:10};

export const STICKERS=['star5','sparkle','heart','flower','leaf','sun','dot','asterisk'];

export const FXDEF={grain:30,dust:40,scratch:35,leak:45,vignette:30};
