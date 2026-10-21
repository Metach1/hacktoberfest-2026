# Design Document

## Overview

This design document outlines the technical implementation for three enhancements to the Starlete project: a social media feed system, visual improvements to the Philippine map, and removal of the athlete-to-athlete donate button. The implementation will leverage the existing React/TypeScript architecture with global state management via the store context.

## Architecture

### System Context
- **Frontend**: Next.js 16 with React 19 and TypeScript
- **Styling**: Tailwind CSS v4 with custom CSS variables
- **State Management**: React Context with localStorage persistence
- **Routing**: Next.js App Router with dynamic routes
- **Data**: In-memory/localStorage with no backend calls

### Key Design Decisions
1. Extend existing store structure rather than creating new state management
2. Maintain backward compatibility with existing athlete data structure
3. Use TypeScript interfaces for type safety across new features
4. Follow existing component patterns and styling conventions
5. Ensure accessibility compliance for all interactive elements

### Component Hierarchy
```
App
├── Layout
│   ├── Navigation (updated with feed link)
│   └── Main Content
├── Routes
│   ├── / (landing)
│   ├── /discover (enhanced map)
│   ├── /feed (new social feed)
│   ├── /athletes/[id] (updated profile)
│   ├── /dashboard
│   └── /login, /register
└── Store Provider
    ├── Athlete State
    ├── Post State (enhanced)
    └── UI State
```

## Components and Interfaces

### New Components

#### 1. FeedScreen Component
- **Location**: `src/app/screens/feed.tsx`
- **Purpose**: Display global feed of all athlete posts
- **Props**: None (reads from store)
- **Features**: Post list, sorting, infinite scroll support

#### 2. PostCard Component
- **Location**: `src/app/shared/post-card.tsx`
- **Purpose**: Display individual post with likes and comments
- **Props**: `{ post: Post, currentUserId: number | string }`
- **Features**: Like/unlike, comment display, author info

#### 3. CommentSection Component
- **Location**: `src/app/shared/comment-section.tsx`
- **Purpose**: Handle comment display and input
- **Props**: `{ postId: string, comments: Comment[] }`
- **Features**: Comment list, add comment form

#### 4. EnhancedPhilippinesMap Component
- **Location**: Updated `src/app/screens/discover.tsx`
- **Purpose**: Enhanced map with choropleth and badges
- **Props**: `{ athletes: Athlete[], selectedRegion: string | null, onSelectRegion: (regionCode: string | null) => void }`
- **Features**: Choropleth shading, athlete count badges, improved interactions

### Updated Components

#### 1. Store Context
- **Location**: `src/app/store.tsx`
- **Updates**: New Post interface, like/comment methods, post migration

#### 2. AthleteProfileScreen
- **Location**: `src/app/screens/athlete-profile.tsx`
- **Updates**: Conditional donate button, post display section

#### 3. DashboardScreen
- **Location**: `src/app/screens/dashboard.tsx`
- **Updates**: Enhanced post creation, post display with likes

#### 4. Navigation
- **Location**: `src/app/shared/chrome.tsx`
- **Updates**: Add feed link to navigation

## Data Models

### 1. Post Data Model

```typescript
interface Comment {
  id: string;
  authorId: number | 'supporter'; // athlete ID or 'supporter' for demo
  authorName: string;
  text: string;
  createdAt: string; // ISO timestamp
}

interface Post {
  id: string;
  authorAthleteId: number;
  authorName: string;
  authorImage: string;
  text: string;
  createdAt: string; // ISO timestamp
  likes: number;
  likedBy: Set<number | string>; // athlete IDs or 'supporter' for demo
  comments: Comment[];
}

// Store extension
interface StarleteState {
  // ... existing fields
  posts: Post[]; // Replace existing string[] posts
  // ... existing methods
  addPost: (post: Omit<Post, 'id' | 'createdAt' | 'likes' | 'likedBy' | 'comments'>) => void;
  likePost: (postId: string, userId: number | string) => void;
  unlikePost: (postId: string, userId: number | string) => void;
  addComment: (postId: string, comment: Omit<Comment, 'id' | 'createdAt'>) => void;
}
```

### 2. Feed Component Hierarchy

```
FeedScreen (new route: /feed)
├── FeedHeader
├── PostList
│   ├── PostCard
│   │   ├── PostHeader (author info)
│   │   ├── PostContent
│   │   ├── PostActions (like, comment)
│   │   └── CommentSection
│   │       ├── CommentList
│   │       └── CommentInput
└── CreatePostModal (reused from dashboard)
```

### 3. Enhanced Philippine Map Component

```typescript
interface EnhancedRegionMapProps {
  athletes: Athlete[];
  selectedRegion: string | null;
  onSelectRegion: (regionCode: string | null) => void;
}

// Visual enhancements:
// - Gradient fill based on athlete count (choropleth)
// - Smooth hover transitions with CSS transitions
// - Badge overlay for athlete counts
// - Improved legend with quantitative scale
// - Enhanced selected state with shadow/border
```

### 4. Profile Page Modification

```typescript
// Conditional donate button rendering
{role !== 'athlete' && (
  <button className="button full gold" onClick={onSupport}>
    Support {athlete.name.split(" ")[0]} <Icon name="heart" />
  </button>
)}
```

## Correctness Properties

### Property 1: Post Creation Round-Trip
Creating a post then reading it back must preserve all fields (id, author, text, timestamp).

**Validates: Requirements 1.1, 1.2**

### Property 2: Like Idempotence
Liking then unliking a post should return the post to its original like state.

**Validates: Requirements 1.5, 1.6**

### Property 3: Comment Preservation
Adding a comment then reading the post must include the comment with all fields intact.

**Validates: Requirements 1.7, 1.8**

### Property 4: Author Consistency
A post's author information must match the athlete data in the store.

**Validates: Requirements 1.10**

### Property 5: Map Selection Consistency
Selecting then deselecting a region must return the map to its original unselected state.

**Validates: Requirements 2.1, 2.4**

### Property 6: Filter Correspondence
Selected region filter must match URL parameter and displayed athlete list.

**Validates: Requirements 2.1**

### Property 7: Region Count Accuracy
Region athlete counts must equal the actual number of athletes in that region.

**Validates: Requirements 2.2, 2.5**

### Property 8: Choropleth Color Monotonic
Choropleth colors must correspond to increasing athlete counts.

**Validates: Requirements 2.2**

### Property 9: Athlete Donate Button Absence
Users with "athlete" role must never see donate buttons on other athlete profiles.

**Validates: Requirements 3.1**

### Property 10: Supporter Donate Button Presence
Users with "supporter" role must always see functional donate buttons.

**Validates: Requirements 3.2**

### Property 11: Navigation Consistency
Feed link must appear in navigation for all logged-in users.

**Validates: Requirements 1.9**

### Property 12: Role Persistence
User role must persist across page reloads via localStorage.

**Validates: Requirements 3.3**

### Property 13: Post Migration Completeness
All existing string posts must be migrated to Post objects.

**Validates: Requirements 1.2**

### Property 14: Migration Field Preservation
Migrated posts must retain original text content.

**Validates: Requirements 1.2**

### Property 15: Store Versioning
DATA_VERSION update must trigger migration only once.

**Validates: Requirements 1.2**

## Error Handling

### Post System Errors
1. **Invalid Post Data**: Attempts to create posts with missing required fields must be rejected
2. **Duplicate Likes**: Attempts to like a post multiple times by same user must be ignored
3. **Invalid Post ID**: Operations on non-existent post IDs must fail gracefully
4. **Storage Quota Exceeded**: localStorage quota errors must be caught and handled without crashing

### Map System Errors
1. **Invalid Region Code**: Attempts to select non-existent region codes must be ignored
2. **Missing Athlete Data**: Map must handle empty athlete lists gracefully
3. **SVG Rendering Errors**: Map SVG must have fallback display for rendering issues
4. **Count Calculation Errors**: Athlete count calculations must handle missing region data

### Authentication Errors
1. **Unauthorized Feed Access**: Non-logged-in users attempting to access /feed must be redirected to login
2. **Invalid Role Operations**: Athletes attempting supporter-only actions must receive appropriate feedback
3. **Session Corruption**: Corrupted localStorage data must be reset to default state
4. **Missing User Data**: Components must handle undefined user state gracefully

### Migration Errors
1. **Corrupted Post Data**: Invalid post data in localStorage must trigger full reset
2. **Version Mismatch**: DATA_VERSION mismatches must trigger clean migration
3. **Partial Migration**: Interrupted migrations must be resumable or restartable
4. **Backward Compatibility**: New code must handle old data format during transition

## Implementation Details

### 1. Social Media Feed Implementation

#### Store Updates
- Extend `store.tsx` with new Post interface and methods
- Update `DATA_VERSION` to invalidate old localStorage data
- Add post persistence to localStorage
- Implement like/unlike logic with user tracking
- Add comment management system

#### New Components
- `FeedScreen`: New page component for `/feed` route
- `PostCard`: Reusable component for displaying posts
- `CommentSection`: Handles comment display and input
- `PostActions`: Like/comment action buttons

#### Route Addition
- Create `app/feed/page.tsx` with FeedScreen
- Update navigation in shared components
- Add route protection (logged-in users only)

### 2. Philippine Map Beautification

#### CSS Enhancements
```css
/* Enhanced map styles */
.ph-region.populated {
  fill: #9db9e8;
  transition: fill 0.3s ease, transform 0.2s ease;
}

.ph-region.populated:hover {
  fill: var(--blue);
  transform: scale(1.01);
  filter: brightness(1.1);
}

.ph-region.selected {
  fill: var(--gold);
  stroke: var(--gold-dark);
  stroke-width: 2;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}

/* Choropleth classes */
.ph-region.count-low { fill: #c2d4ff; }
.ph-region.count-medium { fill: #7fa3ff; }
.ph-region.count-high { fill: var(--blue); }
.ph-region.count-very-high { fill: #0c44b3; }

/* Badge styling */
.region-badge {
  fill: var(--navy);
  font-size: 10px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: central;
}
```

#### Component Updates
- Enhance `PhilippinesMap` component with athlete count calculations
- Add choropleth classification logic
- Implement badge rendering for larger regions
- Update legend with quantitative scale
- Improve selected region header display

### 3. Donate Button Removal

#### Conditional Rendering
- Modify `AthleteProfileScreen` component
- Check user role before rendering donate button
- Maintain layout consistency with conditional spacing
- Update any related conditional logic

## Data Migration

### Post Data Migration
```typescript
// Migration logic for existing posts
const migratePosts = (oldPosts: string[]): Post[] => {
  return oldPosts.map((text, index) => ({
    id: `post-${Date.now()}-${index}`,
    authorAthleteId: athletes[0].id, // Default to first athlete for existing posts
    authorName: athletes[0].name,
    authorImage: athletes[0].image,
    text,
    createdAt: new Date(Date.now() - (index * 86400000)).toISOString(), // Stagger dates
    likes: Math.floor(Math.random() * 50), // Demo data
    likedBy: new Set(),
    comments: []
  }));
};
```

## Accessibility Considerations

### Feed Accessibility
- ARIA labels for like/comment buttons
- Keyboard navigation for post interactions
- Screen reader announcements for new posts
- Focus management in modals

### Map Accessibility
- Maintain existing `role="button"` and `aria-pressed` attributes
- Enhanced `aria-label` with athlete count information
- Keyboard navigation support for region selection
- High contrast mode compatibility

### Button Removal
- Ensure no loss of functionality for supporters
- Maintain logical tab order
- Provide clear visual feedback for state changes

## Performance Considerations

### Post List Optimization
- Virtual scrolling for large feed lists
- Lazy loading of images
- Comment section collapse/expand
- Debounced like actions

### Map Performance
- SVG optimization for rendering
- Memoized region calculations
- Efficient athlete count computations
- Responsive breakpoint adjustments

## Testing Strategy

### Unit Tests
- Store methods for post/like/comment operations
- Map region classification logic
- Conditional button rendering
- Data migration functions

### Integration Tests
- Feed page navigation and display
- Map interaction and filtering
- User role-based UI variations
- LocalStorage persistence

### Property-Based Testing Opportunities
1. **Post creation round-trip**: Creating then reading a post should preserve all fields
2. **Like idempotence**: Liking then unliking a post should return to original state
3. **Map selection consistency**: Selecting then deselecting a region should return to original state
4. **Role-based UI invariant**: Athlete role should never see donate button on other profiles

## Deployment Considerations

### Breaking Changes
- Update `DATA_VERSION` to force localStorage refresh
- Document new `/feed` route
- Update any existing bookmarks or links

### Rollback Plan
- Maintain backward compatibility where possible
- Provide migration path for post data
- Document feature flags if needed

## Success Metrics

### Functional Completion
- All acceptance criteria implemented and tested
- No regression in existing functionality
- Accessibility compliance maintained
- Performance benchmarks met

### User Experience
- Intuitive feed navigation and interaction
- Visually appealing map with clear information hierarchy
- Clean profile pages without confusing buttons
- Responsive design across device sizes