IEPandMe CollaboratED - Complete Brand Style Guide
==================================================

Brand Philosophy
----------------

Creating an empowering, vibrant, and accessible visual identity that reflects innovation in special education while maintaining the trust and professionalism educators expect.

* * * * *

Color Palette
-------------

### Primary Colors

#### Primary Blue

-   **Main**: `#2563EB` - Vibrant, trustworthy blue that conveys reliability and innovation
-   **Light**: `#3B82F6` - For hover states and lighter applications
-   **Dark**: `#1D4ED8` - For pressed states and emphasis
-   **Lightest**: `#DBEAFE` - For backgrounds and subtle highlights

#### Primary Purple

-   **Main**: `#7C3AED` - Creative, innovative purple that suggests transformation
-   **Light**: `#8B5CF6` - For secondary actions
-   **Dark**: `#5B21B6` - For strong emphasis
-   **Lightest**: `#EDE9FE` - For backgrounds

### Secondary Colors

#### Energetic Orange

-   **Main**: `#EA580C` - Warm, energetic color for calls-to-action
-   **Light**: `#FB923C` - For lighter applications
-   **Dark**: `#C2410C` - For emphasis
-   **Lightest**: `#FED7AA` - For backgrounds

#### Success Green

-   **Main**: `#059669` - For positive states and success indicators
-   **Light**: `#10B981` - For lighter success states
-   **Dark**: `#047857` - For strong positive emphasis
-   **Lightest**: `#D1FAE5` - For success backgrounds

#### Growth Teal

-   **Main**: `#0891B2` - Represents growth and progress
-   **Light**: `#06B6D4` - For progress indicators
-   **Dark**: `#0E7490` - For emphasis
-   **Lightest**: `#CFFAFE` - For backgrounds

### Accent Colors

#### Warm Coral

-   **Main**: `#F97316` - Friendly, approachable accent
-   **Light**: `#FB923C` - For hover states
-   **Lightest**: `#FED7AA` - For subtle backgrounds

#### Soft Lavender

-   **Main**: `#A855F7` - Calming yet vibrant accent
-   **Light**: `#C084FC` - For lighter applications
-   **Lightest**: `#F3E8FF` - For backgrounds

### Neutral Colors

#### Sophisticated Grays

-   **Charcoal**: `#1F2937` - Primary text color
-   **Slate**: `#374151` - Secondary text color
-   **Medium**: `#6B7280` - Tertiary text, subtle elements
-   **Light**: `#9CA3AF` - Disabled states, borders
-   **Lighter**: `#D1D5DB` - Light borders, dividers
-   **Lightest**: `#F3F4F6` - Background sections
-   **Off-White**: `#F9FAFB` - Page backgrounds
-   **Pure White**: `#FFFFFF` - Card backgrounds, overlays

### Semantic Colors

#### Error States

-   **Error**: `#DC2626` - Error messages, destructive actions
-   **Error Light**: `#EF4444` - Hover states
-   **Error Background**: `#FEE2E2` - Error backgrounds

#### Warning States

-   **Warning**: `#D97706` - Warning messages, caution
-   **Warning Light**: `#F59E0B` - Warning hover states
-   **Warning Background**: `#FEF3C7` - Warning backgrounds

#### Info States

-   **Info**: `#2563EB` - Information messages (uses primary blue)
-   **Info Light**: `#3B82F6` - Info hover states
-   **Info Background**: `#DBEAFE` - Info backgrounds

* * * * *

Typography System
-----------------

### Font Stack

```
/* Primary Font - Modern Sans-Serif */
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Secondary Font - For headings that need extra impact */
--font-secondary: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Monospace - For code and technical content */
--font-mono: 'JetBrains Mono', 'Fira Code', Consolas, 'Liberation Mono', Menlo, monospace;

```

### Font Sizes & Hierarchy

#### Display Sizes (Hero sections, major headings)

-   **Display XL**: `4.5rem` (72px) - Line height: `1.1` - Weight: 700
-   **Display L**: `3.75rem` (60px) - Line height: `1.1` - Weight: 700
-   **Display M**: `3rem` (48px) - Line height: `1.15` - Weight: 600
-   **Display S**: `2.25rem` (36px) - Line height: `1.2` - Weight: 600

#### Headings

-   **H1**: `2rem` (32px) - Line height: `1.25` - Weight: 600
-   **H2**: `1.75rem` (28px) - Line height: `1.3` - Weight: 600
-   **H3**: `1.5rem` (24px) - Line height: `1.35` - Weight: 600
-   **H4**: `1.25rem` (20px) - Line height: `1.4` - Weight: 500
-   **H5**: `1.125rem` (18px) - Line height: `1.45` - Weight: 500
-   **H6**: `1rem` (16px) - Line height: `1.5` - Weight: 500

#### Body Text

-   **Large**: `1.125rem` (18px) - Line height: `1.6` - Weight: 400
-   **Regular**: `1rem` (16px) - Line height: `1.5` - Weight: 400
-   **Small**: `0.875rem` (14px) - Line height: `1.5` - Weight: 400
-   **X-Small**: `0.75rem` (12px) - Line height: `1.4` - Weight: 400

#### Special Text

-   **Lead**: `1.25rem` (20px) - Line height: `1.6` - Weight: 400 - For introductory paragraphs
-   **Caption**: `0.875rem` (14px) - Line height: `1.4` - Weight: 400 - For captions, metadata
-   **Overline**: `0.75rem` (12px) - Line height: `1.4` - Weight: 500 - Uppercase, for labels

* * * * *

Component Color Applications
----------------------------

### Buttons

#### Primary Button

-   **Background**: Primary Blue (`#2563EB`)
-   **Text**: White (`#FFFFFF`)
-   **Hover**: Primary Blue Light (`#3B82F6`)
-   **Active**: Primary Blue Dark (`#1D4ED8`)
-   **Disabled**: Light Gray (`#D1D5DB`) with Medium Gray text (`#6B7280`)

#### Secondary Button

-   **Background**: Transparent
-   **Border**: Primary Blue (`#2563EB`)
-   **Text**: Primary Blue (`#2563EB`)
-   **Hover**: Primary Blue Lightest (`#DBEAFE`) background
-   **Active**: Primary Blue Light (`#3B82F6`) border and text

#### Accent Button

-   **Background**: Energetic Orange (`#EA580C`)
-   **Text**: White (`#FFFFFF`)
-   **Hover**: Orange Light (`#FB923C`)
-   **Active**: Orange Dark (`#C2410C`)

### Form Elements

#### Input Fields

-   **Background**: White (`#FFFFFF`)
-   **Border**: Light Gray (`#D1D5DB`)
-   **Text**: Charcoal (`#1F2937`)
-   **Placeholder**: Medium Gray (`#6B7280`)
-   **Focus**: Primary Blue (`#2563EB`) border with blue shadow
-   **Error**: Error color (`#DC2626`) border
-   **Success**: Success Green (`#059669`) border

#### Select Dropdowns

-   Same as input fields with dropdown arrow in Medium Gray (`#6B7280`)

#### Checkboxes & Radio Buttons

-   **Unchecked**: Light Gray (`#D1D5DB`) border, white background
-   **Checked**: Primary Blue (`#2563EB`) background, white checkmark
-   **Hover**: Primary Blue Lightest (`#DBEAFE`) background when unchecked

### Cards & Containers

#### Standard Cards

-   **Background**: White (`#FFFFFF`)
-   **Border**: Lighter Gray (`#E5E7EB`)
-   **Shadow**: `0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)`
-   **Hover**: Slight elevation increase

#### Featured Cards

-   **Background**: Primary Blue Lightest (`#DBEAFE`) or Purple Lightest (`#EDE9FE`)
-   **Border**: Corresponding primary color with low opacity
-   **Text**: Maintain contrast ratios

### Navigation

#### Header Navigation

-   **Background**: White (`#FFFFFF`) with subtle shadow
-   **Text**: Charcoal (`#1F2937`)
-   **Active Link**: Primary Blue (`#2563EB`)
-   **Hover**: Primary Blue with reduced opacity

#### Sidebar Navigation

-   **Background**: Off-White (`#F9FAFB`)
-   **Active Item**: Primary Blue (`#2563EB`) background with white text
-   **Hover**: Primary Blue Lightest (`#DBEAFE`) background

* * * * *

Accessibility Guidelines
------------------------

### Color Contrast Requirements

-   **Large Text (18px+ or 14px+ bold)**: Minimum 3:1 contrast ratio
-   **Normal Text**: Minimum 4.5:1 contrast ratio
-   **UI Elements**: Minimum 3:1 contrast ratio for interactive elements

### Color-Blind Considerations

-   Never rely solely on color to convey information
-   Use patterns, shapes, or text labels alongside color coding
-   Test designs with color-blindness simulators

### Focus States

-   All interactive elements must have visible focus indicators
-   Focus rings should be Primary Blue (`#2563EB`) with 2px thickness
-   Focus indicators must have 3:1 contrast against background

* * * * *

Usage Guidelines
----------------

### Color Hierarchy

1.  **Primary Blue**: Main brand actions, primary CTAs, navigation highlights
2.  **Primary Purple**: Innovation features, special promotions, creative elements
3.  **Energetic Orange**: Secondary CTAs, action items, energy/urgency
4.  **Success Green**: Positive feedback, completed states, success messages
5.  **Growth Teal**: Progress indicators, growth metrics, development themes

### Do's and Don'ts

#### Do's

-   Use the primary blue for main navigation and primary actions
-   Implement the 60-30-10 rule: 60% neutrals, 30% primary colors, 10% accent colors
-   Maintain consistent color temperature across the palette
-   Use semantic colors appropriately for their intended states
-   Test all color combinations for accessibility compliance

#### Don'ts

-   Don't use more than 3-4 colors in a single component
-   Don't use pure black (#000000) - always use Charcoal (#1F2937)
-   Don't place similar colors adjacent to each other without sufficient contrast
-   Don't use red and green as the only way to distinguish between states
-   Don't override semantic color meanings (e.g., don't use error red for success)

* * * * *

Implementation Guide
--------------------

### CSS Custom Properties

```
:root {
  /* Primary Colors */
  --color-primary-blue: #2563EB;
  --color-primary-blue-light: #3B82F6;
  --color-primary-blue-dark: #1D4ED8;
  --color-primary-blue-lightest: #DBEAFE;

  --color-primary-purple: #7C3AED;
  --color-primary-purple-light: #8B5CF6;
  --color-primary-purple-dark: #5B21B6;
  --color-primary-purple-lightest: #EDE9FE;

  /* Secondary Colors */
  --color-orange: #EA580C;
  --color-orange-light: #FB923C;
  --color-orange-dark: #C2410C;
  --color-orange-lightest: #FED7AA;

  --color-success: #059669;
  --color-success-light: #10B981;
  --color-success-dark: #047857;
  --color-success-lightest: #D1FAE5;

  --color-teal: #0891B2;
  --color-teal-light: #06B6D4;
  --color-teal-dark: #0E7490;
  --color-teal-lightest: #CFFAFE;

  /* Neutrals */
  --color-gray-900: #1F2937;
  --color-gray-800: #374151;
  --color-gray-600: #6B7280;
  --color-gray-400: #9CA3AF;
  --color-gray-300: #D1D5DB;
  --color-gray-100: #F3F4F6;
  --color-gray-50: #F9FAFB;
  --color-white: #FFFFFF;

  /* Semantic Colors */
  --color-error: #DC2626;
  --color-error-light: #EF4444;
  --color-error-bg: #FEE2E2;

  --color-warning: #D97706;
  --color-warning-light: #F59E0B;
  --color-warning-bg: #FEF3C7;

  --color-info: #2563EB;
  --color-info-light: #3B82F6;
  --color-info-bg: #DBEAFE;

  /* Typography */
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-secondary: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', Consolas, 'Liberation Mono', Menlo, monospace;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1);
}

```

### Utility Classes

```
/* Background Colors */
.bg-primary { background-color: var(--color-primary-blue); }
.bg-primary-light { background-color: var(--color-primary-blue-lightest); }
.bg-secondary { background-color: var(--color-primary-purple); }
.bg-accent { background-color: var(--color-orange); }
.bg-success { background-color: var(--color-success); }
.bg-white { background-color: var(--color-white); }
.bg-gray-50 { background-color: var(--color-gray-50); }

/* Text Colors */
.text-primary { color: var(--color-primary-blue); }
.text-secondary { color: var(--color-primary-purple); }
.text-gray-900 { color: var(--color-gray-900); }
.text-gray-600 { color: var(--color-gray-600); }
.text-white { color: var(--color-white); }
.text-success { color: var(--color-success); }
.text-error { color: var(--color-error); }

/* Typography */
.font-primary { font-family: var(--font-primary); }
.font-secondary { font-family: var(--font-secondary); }
.text-display-xl { font-size: 4.5rem; line-height: 1.1; font-weight: 700; }
.text-display-l { font-size: 3.75rem; line-height: 1.1; font-weight: 700; }
.text-h1 { font-size: 2rem; line-height: 1.25; font-weight: 600; }
.text-h2 { font-size: 1.75rem; line-height: 1.3; font-weight: 600; }
.text-body-lg { font-size: 1.125rem; line-height: 1.6; font-weight: 400; }
.text-body { font-size: 1rem; line-height: 1.5; font-weight: 400; }

```

* * * * *

Brand Applications
------------------

### Logo Usage

-   **Primary**: Use on white or very light backgrounds
-   **Reversed**: Use on dark backgrounds or primary color backgrounds
-   **Monochrome**: For single-color applications

### Color Combinations That Work

1.  **Primary Blue + White + Light Gray**: Professional, trustworthy
2.  **Purple + Orange + White**: Creative, energetic
3.  **Teal + Success Green + White**: Growth, progress-focused
4.  **Orange + Purple + White**: Dynamic, innovative
5.  **Blue + Teal + White**: Reliable, forward-thinking

### Marketing Applications

-   **Digital Ads**: Use high-contrast color combinations with primary blue or orange CTAs
-   **Print Materials**: Maintain color accuracy with CMYK values
-   **Social Media**: Vibrant combinations of purple and orange for engagement
-   **Email**: Stick to primary blues and whites for professionalism

* * * * *

This comprehensive style guide provides a vibrant yet professional foundation for IEPandMe's CollaboratED platform, ensuring consistency across all touchpoints while maintaining the trust and approachability needed for educational technology.