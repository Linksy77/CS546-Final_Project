import { Router } from 'express';
const router = Router();
import * as neighborhoodsData from '../data/neighborhoods.js';
import * as neighborhoodStats from '../data/neighborhoodStats.js';

// GET /neighborhoods - List all neighborhoods
router
  .route('/neighborhoods')
  .get(async (req, res) => {
    try {
      const allNeighborhoods = await neighborhoodsData.getAllNeighborhoods();
      
      const neighborhoodsWithColors = allNeighborhoods.map(hood => ({
        ...hood,
        quietScore: hood.quietScore ? parseFloat(hood.quietScore).toFixed(1) : '5.0',
        quietScoreColor: neighborhoodStats.getQuietScoreColor(hood.quietScore || 5)
      }));
      
      const byBorough = {
        'Manhattan': [],
        'Brooklyn': [],
        'Queens': [],
        'Bronx': [],
        'Staten Island': []
      };
      
      neighborhoodsWithColors.forEach(hood => {
        if (byBorough[hood.borough]) {
          byBorough[hood.borough].push(hood);
        }
      });
      
      Object.keys(byBorough).forEach(borough => {
        byBorough[borough].sort((a, b) => a.name.localeCompare(b.name));
      });
      
      return res.render('neighborhoods/list', {
        user: req.session.user || null,
        neighborhoods: byBorough,
        totalCount: allNeighborhoods.length
      });
    } catch (e) {
      console.error('Error fetching neighborhoods:', e);
      return res.status(500).render('error', {
        title: 'Error',
        error: 'Unable to load neighborhoods at this time.'
      });
    }
  });

// GET /neighborhoods/compare - Comparison tool page
router
  .route('/neighborhoods/compare')
  .get(async (req, res) => {
    try {
      const id1 = req.query.id1;
      const id2 = req.query.id2;
      
      if (id1 && id2) {
        try {
          const comparison = await neighborhoodStats.compareNeighborhoods(id1, id2);
          
          return res.render('neighborhoods/compare', {
            title: 'Compare Neighborhoods',
            user: req.session.user || null,
            hasComparison: true,
            comparison: comparison,
            neighborhood1: comparison.neighborhood1,
            neighborhood2: comparison.neighborhood2,
            comparisonData: comparison.comparison
          });
        } catch (compareError) {
          console.error('Comparison error:', compareError);
          return res.render('neighborhoods/compare', {
            title: 'Compare Neighborhoods',
            user: req.session.user || null,
            hasComparison: false,
            error: 'Could not compare the selected neighborhoods. Please try again.'
          });
        }
      }
      
      const allNeighborhoods = await neighborhoodsData.getAllNeighborhoods();
      
      allNeighborhoods.sort((a, b) => {
        if (a.borough !== b.borough) {
          return a.borough.localeCompare(b.borough);
        }
        return a.name.localeCompare(b.name);
      });
      
      return res.render('neighborhoods/compare', {
        title: 'Compare Neighborhoods',
        user: req.session.user || null,
        hasComparison: false,
        neighborhoods: allNeighborhoods,
        selectedId1: id1 || '',
        selectedId2: id2 || ''
      });
    } catch (e) {
      console.error('Error loading comparison page:', e);
      return res.status(500).render('error', {
        title: 'Error',
        error: 'Unable to load comparison tool at this time.'
      });
    }
  });

// GET /neighborhoods/:id - Individual neighborhood detail
router
  .route('/neighborhoods/:id')
  .get(async (req, res) => {
    try {
      const neighborhoodId = req.params.id;
      const profile = await neighborhoodStats.getNeighborhoodProfile(neighborhoodId);
      
      return res.render('neighborhoods/detail', {
        title: `${profile.name} - ${profile.borough}`,
        user: req.session.user || null,
        neighborhood: profile,
        stats: profile.stats,
        scoreDescription: profile.quietScoreDescription,
        scoreColor: profile.quietScoreColor,
        personalityTag: profile.personalityTag
      });
    } catch (e) {
      console.error('Error fetching neighborhood detail:', e);
      return res.status(404).render('error', {
        title: 'Error',
        error: 'Neighborhood not found.'
      });
    }
  });

export default router;