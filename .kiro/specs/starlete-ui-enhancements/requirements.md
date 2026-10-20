# Requirements Document

## Introduction

The Starlete project is a Next.js 16 / React 19 / TypeScript application with Tailwind v4 that supports Filipino athletes. This feature enhancement implements three key improvements: a social media feed for athlete updates, visual enhancements to the interactive Philippine map, and removal of the confusing athlete-to-athlete donate button.

## Glossary

- **System**: The Starlete web application
- **Post**: A social media update created by an athlete containing text content, likes, and comments
- **Feed**: A global view showing all athletes' posts in reverse chronological order
- **Philippine_Map**: The interactive SVG map component on the discover page showing athlete distribution by region
- **Store**: The global state management system using React context and localStorage persistence
- **Donate_Button**: The button on athlete profile pages that allows supporters to donate to athletes

## Requirements

### Requirement 1: Social Media Feed

**User Story:** As an athlete, I want to post updates about my training and progress, so that my supporters can stay engaged with my journey.

#### Acceptance Criteria

1. WHERE a Post object is created, THE System SHALL include id, authorAthleteId, text, createdAt timestamp, likes count, and comments array fields
2. WHEN an athlete creates a post, THE Post_Manager SHALL store it in the global store with auto-generated unique ID and current timestamp
3. WHEN a user navigates to the /feed route, THE Feed_View SHALL display all posts from all athletes sorted by createdAt descending
4. WHEN viewing an athlete profile page, THE Profile_View SHALL display that athlete's posts with like counts and comments
5. WHERE a supporter views a post, THE System SHALL provide buttons to like/unlike the post
6. WHEN a supporter clicks the like button, THE Post_Manager SHALL increment the post's likes count and store the supporter's ID to prevent duplicate likes
7. WHERE a user views a post, THE System SHALL display a comment input field for adding new comments
8. WHEN a comment is submitted, THE Post_Manager SHALL add it to the post's comments array with author ID, text, and timestamp
9. THE Navigation SHALL include a link to the global feed page accessible to all logged-in users
10. FOR ALL posts, the author's name and profile image SHALL be displayed alongside the post content

### Requirement 2: Philippine Map Beautification

**User Story:** As a user, I want the Philippine map to be visually appealing and informative, so that I can easily explore athlete distribution across regions.

#### Acceptance Criteria

1. THE Philippine_Map SHALL maintain all existing functionality including region clicking, URL parameter filtering, and athlete filtering
2. WHERE a region has athletes, THE Map_Visual SHALL apply choropleth shading based on athlete count with smooth color transitions
3. WHEN a user hovers over a populated region, THE Map_Visual SHALL apply a highlight effect with smooth transition animation
4. WHERE a region is selected, THE Map_Visual SHALL apply a distinct visual style with enhanced border and fill color
5. THE Map_Visual SHALL display athlete count badges on each populated region when space permits
6. THE Map_Legend SHALL be enhanced with clear visual indicators for populated, selected, and empty regions
7. THE Selected_Region_Heading SHALL display region name and athlete count in an improved visual layout
8. THE Philippine_Map SHALL maintain full accessibility including roles, aria-pressed, keyboard navigation, and screen reader compatibility
9. WHERE responsive design is required, THE Map_Visual SHALL adapt appropriately to different screen sizes
10. THE Color_Palette SHALL use the existing navy/blue/gold palette with appropriate variations for visual hierarchy

### Requirement 3: Remove Athlete-to-Athlete Donate Button

**User Story:** As an athlete, I don't want to see a disabled "Athletes cannot donate" button when viewing other athlete profiles, so that the interface is less confusing.

#### Acceptance Criteria

1. WHEN a user with role "athlete" views another athlete's profile page, THE System SHALL NOT display the donate button
2. WHEN a user with role "supporter" views an athlete profile page, THE Donate_Button SHALL remain functional and visible
3. WHEN a user is not logged in and views an athlete profile page, THE Donate_Button SHALL redirect to login when clicked
4. THE UI_Layout SHALL adjust appropriately when the donate button is removed to maintain visual balance
5. ALL existing donation functionality for supporters SHALL remain unchanged and fully operational