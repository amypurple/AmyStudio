### Graphics II bitmap compression ratios

The corpus contains 42 unique pictures. Each picture is exactly 12,288 RAW bytes (6,144 Pattern + 6,144 Color). Percentages are compressed payload / RAW payload; lower is better. Decoder code is excluded because it is linked once and may serve several assets. Every measured stream round-trips exactly; DAN3 uses its full-search best-size setting. One ZX0 column is shown; z88dk's v1 streams had the same payload lengths on this corpus but are not byte-compatible with Amy Studio's v2 streams.

### Aggregate codec ranking

This ranking sums every compressed Pattern + Color payload in the corpus. Podium counts rank each picture by first-use ROM cost: payload plus one linked decoder. RAM requirements remain separate.

| Rank | Codec | Total bytes | Average ratio | Median ratio | 1st | 2nd | 3rd | 4th | 5th |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Exomizer 2 | 161,374 | 31.27% | 23.43% | 21 | 12 | 2 | 3 | 1 |
| 2 | ZX0 | 166,556 | 32.27% | 23.63% | 21 | 18 | 1 | 2 | 0 |
| 3 | DAN2 | 166,923 | 32.34% | 23.99% | 0 | 0 | 7 | 13 | 10 |
| 4 | DAN3 | 167,186 | 32.39% | 23.99% | 0 | 0 | 16 | 5 | 11 |
| 5 | DAN1 | 167,240 | 32.41% | 24.04% | 0 | 3 | 4 | 9 | 16 |
| 6 | MegaLZ | 171,016 | 33.14% | 24.66% | 0 | 0 | 1 | 1 | 1 |
| 7 | aPLib Compact | 171,484 | 33.23% | 24.52% | 0 | 0 | 0 | 0 | 0 |
| 8 | Pletter | 171,751 | 33.28% | 24.80% | 0 | 0 | 0 | 0 | 0 |
| 9 | ZX7 | 171,788 | 33.29% | 24.77% | 0 | 0 | 2 | 9 | 3 |
| 10 | BitBuster | 172,941 | 33.51% | 24.94% | 0 | 0 | 0 | 0 | 0 |
| 11 | ZX1 | 176,562 | 34.21% | 24.98% | 0 | 4 | 5 | 0 | 0 |
| 12 | ZX2 | 177,582 | 34.41% | 25.40% | 0 | 5 | 4 | 0 | 0 |
| 13 | LZF | 193,412 | 37.48% | 28.36% | 0 | 0 | 0 | 0 | 0 |
| 14 | Nibble | 214,555 | 41.57% | 35.48% | 0 | 0 | 0 | 0 | 0 |
| 15 | MDK-RLE | 253,859 | 49.19% | 42.52% | 0 | 0 | 0 | 0 | 0 |
| 16 | MSC1 | 259,023 | 50.19% | 45.63% | 0 | 0 | 0 | 0 | 0 |

### LZ-family ratios

| Picture | ZX0 | ZX1 | ZX2 | ZX7 | aPLib Compact | MegaLZ | Exomizer 2 | MSC1 | Pletter | BitBuster | LZF |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Cake | 24.07% | 25.33% | 25.42% | 25.26% | 24.85% | 25.25% | 23.89% | 39.95% | 25.29% | 25.44% | 29.48% |
| Commando | 43.21% | 45.58% | 45.18% | 44.86% | 44.39% | 44.01% | 42.37% | 61.94% | 44.82% | 45.07% | 49.93% |
| Warrior | 23.19% | 24.12% | 25.38% | 24.28% | 24.19% | 24.06% | 22.96% | 30.24% | 24.32% | 24.43% | 26.00% |
| Barbarian | 34.42% | 36.11% | 36.39% | 35.31% | 35.45% | 35.46% | 33.89% | 48.10% | 35.31% | 35.51% | 39.10% |
| 421 Title | 8.59% | 8.97% | 9.08% | 9.02% | 8.94% | 9.55% | 8.63% | 15.39% | 9.03% | 9.16% | 11.01% |
| Dacman Title | 8.01% | 8.33% | 8.49% | 8.38% | 8.24% | 8.75% | 7.87% | 12.71% | 8.42% | 8.50% | 9.62% |
| Dacman Information | 10.25% | 10.47% | 11.34% | 11.06% | 10.38% | 10.92% | 10.16% | 15.40% | 11.08% | 11.19% | 12.51% |
| Dacman 2 Title | 9.56% | 10.04% | 10.13% | 9.99% | 9.99% | 10.24% | 9.29% | 18.35% | 10.02% | 10.12% | 11.82% |
| Le Chateau du Dragon | 13.31% | 13.70% | 13.77% | 14.07% | 13.88% | 14.16% | 13.13% | 20.98% | 14.08% | 14.18% | 15.53% |
| Almighty God - Aliquis Acuario Ingens | 58.87% | 62.06% | 61.45% | 60.77% | 60.66% | 60.24% | 57.77% | 85.00% | 60.60% | 61.06% | 68.17% |
| Aloha (ArtField 2010, 1) | 57.03% | 60.05% | 60.21% | 58.56% | 58.15% | 57.98% | 54.96% | 83.74% | 58.59% | 58.85% | 66.17% |
| Aorante - Lady Saturn | 29.81% | 32.06% | 32.94% | 31.04% | 30.66% | 30.82% | 28.46% | 52.94% | 31.01% | 31.23% | 35.95% |
| Bejeweled | 12.73% | 13.14% | 12.99% | 13.52% | 13.26% | 13.83% | 12.36% | 25.76% | 13.52% | 13.67% | 16.44% |
| Anime Portrait | 17.71% | 19.06% | 19.08% | 18.39% | 18.28% | 18.51% | 17.07% | 31.04% | 18.43% | 18.57% | 21.17% |
| Band Wagon Logo | 17.68% | 18.50% | 18.27% | 18.34% | 18.18% | 18.90% | 17.54% | 26.45% | 18.25% | 18.47% | 21.92% |
| Bat Character | 7.98% | 8.42% | 8.57% | 8.58% | 8.22% | 8.68% | 7.69% | 15.01% | 8.55% | 8.70% | 10.19% |
| Blue Portrait | 49.42% | 52.86% | 52.74% | 50.74% | 51.00% | 50.22% | 48.03% | 72.71% | 50.65% | 51.07% | 57.87% |
| Fantasy Camp | 50.22% | 53.39% | 52.75% | 51.37% | 51.55% | 50.97% | 48.80% | 71.01% | 51.41% | 51.69% | 57.43% |
| Feliz Navidad | 33.81% | 36.29% | 37.12% | 34.95% | 34.56% | 34.79% | 32.54% | 66.57% | 34.99% | 35.25% | 40.52% |
| Laser Squad | 61.61% | 64.27% | 63.88% | 63.23% | 63.35% | 62.45% | 59.87% | 80.23% | 63.26% | 63.45% | 70.86% |
| Mermaid Portrait | 49.24% | 52.82% | 52.47% | 50.44% | 50.72% | 49.99% | 47.59% | 74.54% | 50.42% | 50.74% | 57.67% |
| Reservoir Dogs | 18.84% | 20.27% | 20.93% | 19.69% | 19.47% | 19.64% | 17.97% | 38.67% | 19.65% | 19.90% | 22.67% |
| Robot Quote | 17.24% | 18.59% | 19.55% | 18.01% | 17.79% | 17.94% | 16.19% | 33.93% | 18.04% | 18.24% | 21.26% |
| Space Soldier | 46.49% | 49.64% | 49.72% | 47.89% | 47.76% | 47.35% | 44.94% | 73.45% | 47.90% | 48.21% | 54.13% |
| Turban Character | 65.04% | 68.89% | 68.29% | 66.56% | 66.95% | 65.72% | 62.08% | 87.39% | 66.49% | 66.89% | 75.40% |
| Mad Cow | 17.77% | 18.60% | 18.79% | 18.45% | 18.33% | 18.26% | 17.29% | 27.04% | 18.50% | 18.60% | 19.65% |
| Blair (Chaos Constructions 2009, 6) | 43.72% | 47.18% | 47.33% | 44.69% | 44.57% | 44.49% | 41.83% | 71.88% | 44.69% | 45.00% | 49.63% |
| Bugs (Demobit 1995, 4) | 17.15% | 18.58% | 19.14% | 17.79% | 17.62% | 17.73% | 16.54% | 33.24% | 17.83% | 17.96% | 19.89% |
| F1 SPP | 35.12% | 37.67% | 37.94% | 36.27% | 35.74% | 35.42% | 33.93% | 54.30% | 36.31% | 36.56% | 40.28% |
| Kozmonaut (Forever 7, 7) | 22.72% | 24.63% | 25.05% | 23.50% | 23.45% | 23.41% | 21.92% | 42.14% | 23.54% | 23.72% | 26.51% |
| lenna | 76.50% | 81.26% | 80.31% | 77.75% | 79.04% | 76.73% | 73.82% | 95.52% | 77.77% | 78.10% | 85.99% |
| Maze Maniac | 22.08% | 23.77% | 24.54% | 22.98% | 22.59% | 23.23% | 21.36% | 43.16% | 22.92% | 23.22% | 27.24% |
| Mona Lisa | 76.71% | 80.44% | 79.16% | 78.77% | 79.74% | 78.54% | 74.93% | 94.72% | 78.45% | 79.04% | 85.11% |
| ROM File Edition | 7.33% | 7.61% | 7.58% | 7.80% | 7.57% | 8.37% | 7.36% | 15.54% | 7.81% | 7.92% | 9.92% |
| Pegasus (Millennium 1903, 1) | 52.12% | 55.52% | 55.61% | 53.22% | 53.70% | 53.17% | 50.20% | 76.23% | 53.26% | 53.56% | 58.91% |
| Phantis (3BM OpenAir 2014, 1) | 68.58% | 71.68% | 71.99% | 69.93% | 70.69% | 69.94% | 65.99% | 91.10% | 69.98% | 70.32% | 75.28% |
| Robee Blaster Title | 16.94% | 18.09% | 19.72% | 17.36% | 17.20% | 17.76% | 16.47% | 62.35% | 17.40% | 17.52% | 20.43% |
| Smurf Challenge | 10.34% | 11.04% | 11.00% | 10.95% | 10.72% | 10.84% | 9.99% | 18.42% | 10.92% | 11.09% | 12.39% |
| Stainly Rainbow (ArtField 2006, 3) | 18.29% | 19.55% | 21.22% | 19.21% | 19.11% | 19.12% | 17.66% | 34.87% | 19.19% | 19.40% | 22.50% |
| Vranov (Chaos Constructions 2001, 7) | 28.28% | 29.96% | 30.31% | 29.30% | 29.09% | 29.24% | 27.64% | 49.83% | 29.29% | 29.52% | 32.82% |
| Xzema (Chaos Constructions 2001, 2) | 55.97% | 59.59% | 60.21% | 57.58% | 57.36% | 56.83% | 53.26% | 83.39% | 57.61% | 57.94% | 63.87% |
| Znachok (Enlight 1996, 15) | 17.50% | 18.72% | 19.13% | 18.13% | 18.12% | 18.23% | 17.04% | 32.71% | 18.12% | 18.33% | 20.78% |

### DAN and RLE-family ratios

| Picture | DAN1 | DAN2 | DAN3 | Nibble | MDK-RLE |
|---|---:|---:|---:|---:|---:|
| Cake | 24.46% | 24.41% | 24.45% | 28.92% | 33.11% |
| Commando | 43.33% | 43.23% | 43.29% | 51.23% | 59.29% |
| Warrior | 23.62% | 23.58% | 23.53% | 27.22% | 30.00% |
| Barbarian | 35.34% | 35.29% | 34.88% | 41.32% | 44.78% |
| 421 Title | 8.76% | 8.68% | 9.05% | 11.95% | 13.96% |
| Dacman Title | 7.89% | 7.91% | 8.41% | 9.63% | 11.31% |
| Dacman Information | 10.38% | 10.36% | 10.51% | 13.31% | 14.59% |
| Dacman 2 Title | 9.53% | 9.51% | 9.71% | 13.54% | 16.42% |
| Le Chateau du Dragon | 13.44% | 13.44% | 13.49% | 17.01% | 18.95% |
| Almighty God - Aliquis Acuario Ingens | 59.67% | 59.42% | 59.17% | 73.33% | 85.86% |
| Aloha (ArtField 2010, 1) | 56.88% | 56.89% | 57.09% | 69.84% | 82.63% |
| Aorante - Lady Saturn | 29.85% | 29.76% | 29.73% | 41.28% | 50.13% |
| Bejeweled | 12.97% | 13.00% | 13.05% | 19.29% | 23.71% |
| Anime Portrait | 17.73% | 17.55% | 17.59% | 22.06% | 27.40% |
| Band Wagon Logo | 17.88% | 17.77% | 18.48% | 21.11% | 25.43% |
| Bat Character | 8.03% | 8.05% | 8.27% | 10.21% | 12.67% |
| Blue Portrait | 49.67% | 49.62% | 49.71% | 59.59% | 70.69% |
| Fantasy Camp | 50.02% | 49.95% | 50.08% | 60.06% | 69.77% |
| Feliz Navidad | 34.05% | 33.97% | 33.76% | 51.24% | 62.95% |
| Laser Squad | 60.99% | 60.94% | 61.40% | 70.08% | 78.13% |
| Mermaid Portrait | 49.53% | 49.40% | 49.50% | 62.32% | 75.78% |
| Reservoir Dogs | 19.25% | 19.11% | 18.85% | 26.25% | 32.17% |
| Robot Quote | 17.20% | 17.07% | 16.89% | 25.59% | 31.99% |
| Space Soldier | 46.07% | 45.97% | 46.35% | 59.65% | 70.23% |
| Turban Character | 64.36% | 64.38% | 64.81% | 74.41% | 85.03% |
| Mad Cow | 17.80% | 17.74% | 17.67% | 23.10% | 27.32% |
| Blair (Chaos Constructions 2009, 6) | 43.90% | 43.75% | 43.73% | 58.82% | 70.54% |
| Bugs (Demobit 1995, 4) | 17.28% | 17.23% | 17.02% | 22.63% | 28.31% |
| F1 SPP | 34.94% | 34.81% | 34.81% | 51.20% | 64.82% |
| Kozmonaut (Forever 7, 7) | 22.91% | 22.79% | 22.62% | 30.22% | 37.26% |
| lenna | 76.71% | 76.70% | 76.97% | 84.30% | 99.32% |
| Maze Maniac | 22.44% | 22.38% | 22.05% | 32.10% | 40.26% |
| Mona Lisa | 78.52% | 78.37% | 77.23% | 84.12% | 98.52% |
| ROM File Edition | 7.41% | 7.40% | 7.86% | 10.90% | 13.20% |
| Pegasus (Millennium 1903, 1) | 52.21% | 52.22% | 52.39% | 66.51% | 78.53% |
| Phantis (3BM OpenAir 2014, 1) | 68.25% | 68.26% | 68.38% | 81.18% | 90.24% |
| Robee Blaster Title | 17.31% | 17.12% | 17.13% | 67.66% | 83.18% |
| Smurf Challenge | 10.29% | 10.33% | 10.36% | 12.96% | 16.04% |
| Stainly Rainbow (ArtField 2006, 3) | 18.45% | 18.33% | 18.45% | 26.06% | 32.24% |
| Vranov (Chaos Constructions 2001, 7) | 28.69% | 28.65% | 28.43% | 38.85% | 47.67% |
| Xzema (Chaos Constructions 2001, 2) | 55.32% | 55.46% | 56.04% | 71.64% | 83.06% |
| Znachok (Enlight 1996, 15) | 17.72% | 17.64% | 17.37% | 23.32% | 28.39% |

### Amy direct-to-VRAM decompressor sizes

These are assembled routine bytes, excluding compressed data and common program startup code. A routine is linked once and can decode any number of assets using that codec.

| Codec | Routine bytes |
|---|---:|
| ZX0 | 136 |
| ZX1 | 127 |
| ZX2 | 115 |
| ZX7 | 136 |
| aPLib Compact | 244 |
| MegaLZ | 162 |
| Exomizer 2 | 226 |
| MSC1 | 68 |
| Pletter | 212 |
| BitBuster | 166 |
| LZF | 117 |
| DAN1 | 205 |
| DAN2 | 212 |
| DAN3 | 205 |
| Nibble | 115 |
| MDK-RLE | 46 |

### Representative first-use totals

Each value is the complete compressed Pattern + Color payload plus one Amy direct-to-VRAM decompressor. It is not the full ROM size. Commando, Warrior, and Dacman title represent a difficult, middle, and highly compressible case in this corpus.

### LZ-family first-use bytes

| Codec | Commando | Warrior | Dacman Title |
|---|---:|---:|---:|
| ZX0 | 5446 | 2985 | 1120 |
| ZX1 | 5728 | 3091 | 1151 |
| ZX2 | 5667 | 3234 | 1158 |
| ZX7 | 5649 | 3120 | 1166 |
| aPLib Compact | 5699 | 3217 | 1256 |
| MegaLZ | 5570 | 3119 | 1237 |
| Exomizer 2 | 5432 | 3047 | 1193 |
| MSC1 | 7679 | 3784 | 1630 |
| Pletter | 5720 | 3200 | 1247 |
| BitBuster | 5704 | 3168 | 1211 |
| LZF | 6253 | 3312 | 1299 |

### DAN and RLE-family first-use bytes

| Codec | Commando | Warrior | Dacman Title |
|---|---:|---:|---:|
| DAN1 | 5529 | 3108 | 1174 |
| DAN2 | 5524 | 3109 | 1184 |
| DAN3 | 5525 | 3096 | 1238 |
| Nibble | 6410 | 3460 | 1298 |
| MDK-RLE | 7331 | 3733 | 1436 |

Amy Studio's aPLib Compact routine is 244 bytes under every optimization profile, replacing the previous 348-byte unrolled routine. It preserves IX and IY, writes directly to VRAM, and keeps the same stream format and compressed payloads. MDK-RLE remains the smallest decoder at 46 bytes, but its payloads are much larger on these pictures.

The complete payload counts and ratios are preserved in `bitmap-codec-ratios.csv`; decoder and representative first-use totals are in `bitmap-codec-first-use.csv`.
