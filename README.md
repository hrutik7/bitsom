# Fitline

Your body picks the size, not your guess.

For the full picture, read the one-pager: [Fitline-OnePager.pdf](./Fitline-OnePager.pdf)

## The problem

When you buy clothes online, you guess your size. A Medium in one brand is a Small in another, and the guess is often wrong.

In India, 25 to 40% of apparel bought online gets returned, and around 70% of those returns happen because of size and fit. Most shoppers pick a size from memory or gut feel, not from their actual measurements. Every wrong guess costs the brand shipping both ways and often costs them the customer too.

## What we built

Fitline tells a shopper their size in every product before they buy, and tells them why.

You give it your measurements, or just one photo and your height. It works out your chest, waist and hip, compares them with the brand's size chart, and picks the size that fits best. Then it explains the pick in one simple line, like "S gives your hip only 14 cm of room".

You save your body once, and every product in the store shows your size. The same person can be M in an oversized tee, S in a regular tee and XL in a fitted one. That is exactly why guessing fails.

You can also see the size drawn on your body to scale, or try the tee on live through your camera.

## Why it matters

- Everything runs on the shopper's phone. Photos never leave the device.
- There is no cloud cost per shopper, so it stays cheap as traffic grows.
- Brands don't need anything new. Fitline works with the size chart they already have.
- Shoppers see the reason behind every size, so they trust it.

## Try it

You need Node.js 20.19 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173, click **Find your size** on any product, and you will see a recommendation straight away. Switch to **Photo / camera** to try it with your own photo.

To use the camera on your phone, the page needs HTTPS. The easiest way is a free Cloudflare tunnel, with no login needed:

```bash
cloudflared tunnel --url http://localhost:5173
```

Open the link it prints on your phone.

## What's next

We want to train our own computer vision model on real, tape-measured bodies so the estimates get even tighter. After that, we want to take the same engine into other markets where fit decides the sale: footwear, eyewear, uniforms and tailoring.
