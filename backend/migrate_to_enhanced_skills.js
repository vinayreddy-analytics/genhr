// migrate_to_enhanced_skills.js
// Migration script to upgrade existing interviews to Phase 2 enhanced skills

import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'genhr';

// Skill categorization and synonym data (copied from Python)
const SKILL_CATEGORIES = {
  'design_tools': ['autocad', 'solidworks', 'revit', 'inventor', 'catia', 'creo', 'bim'],
  'programming_languages': ['python', 'javascript', 'java', 'sql', 'r', 'matlab', 'c++', 'c#'],
  'data_analytics': ['tableau', 'power bi', 'excel', 'pandas', 'numpy', 'matplotlib', 'spss'],
  'machine_learning': ['scikit-learn', 'tensorflow', 'pytorch', 'keras', 'xgboost'],
  'sales_tools': ['salesforce', 'hubspot', 'linkedin sales navigator', 'crm'],
  'project_management': ['jira', 'confluence', 'asana', 'microsoft project', 'gantt charts'],
  'development_tools': ['git', 'docker', 'kubernetes', 'jenkins', 'vs code'],
  'web_frameworks': ['react', 'angular', 'vue', 'nodejs', 'express', 'django'],
  'cloud_platforms': ['aws', 'azure', 'gcp', 'heroku'],
  'databases': ['mysql', 'postgresql', 'mongodb', 'redis', 'oracle']
};

const SKILL_SYNONYMS = {
  'autocad': ['cad', 'computer aided design', '2d design', '3d modeling', 'technical drawing'],
  'solidworks': ['solid works', '3d modeling', 'parametric design', 'mechanical design'],
  'revit': ['bim', 'building information modeling', 'architectural design'],
  'python': ['python programming', 'py', 'python3', 'python development'],
  'javascript': ['js', 'ecmascript', 'javascript programming'],
  'sql': ['structured query language', 'database querying', 'data querying'],
  'tableau': ['data visualization', 'business intelligence', 'dashboard creation'],
  'power bi': ['powerbi', 'microsoft power bi', 'business intelligence'],
  'excel': ['microsoft excel', 'spreadsheet analysis', 'data analysis'],
  'salesforce': ['sfdc', 'crm', 'customer relationship management'],
  'react': ['reactjs', 'frontend framework', 'javascript framework'],
  'git': ['version control', 'source control', 'github', 'gitlab']
};

function categorizeSkill(skillName) {
  const skillLower = skillName.toLowerCase().trim();
  
  for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
    if (skills.includes(skillLower)) return category;
    if (skills.some(s => skillLower.includes(s) || s.includes(skillLower))) return category;
  }
  
  return 'general';
}

function getSkillSynonyms(skillName) {
  const skillLower = skillName.toLowerCase().trim();
  return SKILL_SYNONYMS[skillLower] || [];
}

function createEnhancedSkillsFromLegacy(interview) {
  const matchingKeywords = interview.matching_keywords || [];
  const areasForImprovement = interview.areas_for_improvement || [];
  const competencyScores = interview.competency_scores || {};
  const jobTitle = interview.role || 'Professional';
  
  console.log(`   Migrating ${matchingKeywords.length} keywords for ${jobTitle}`);
  
  const verifiedSkills = [];
  
  // Process matching_keywords
  matchingKeywords.forEach((keyword, index) => {
    const skillName = keyword.toLowerCase().trim();
    const category = categorizeSkill(skillName);
    const synonyms = getSkillSynonyms(skillName);
    
    // Estimate score based on position and competency
    let estimatedScore = 75 + (5 - index) * 3; // First skills get higher scores
    
    // Adjust based on competency scores
    if (competencyScores.technical_skills && category !== 'general') {
      estimatedScore = Math.round((estimatedScore + competencyScores.technical_skills) / 2);
    }
    
    verifiedSkills.push({
      skill: skillName.replace(' ', '_'),
      display_name: keyword,
      score: Math.min(100, estimatedScore),
      level: estimatedScore >= 80 ? 'advanced' : estimatedScore >= 65 ? 'intermediate' : 'beginner',
      category: category,
      synonyms: synonyms,
      evidence: `Mentioned ${keyword} in interview`,
      confidence: Math.min(1.0, estimatedScore / 100),
      mentioned_in_intro: true,
      job_relevance: 0.8 // Default high relevance for migrated skills
    });
  });
  
  // Process areas_for_improvement (lower scores)
  areasForImprovement.forEach(area => {
    if (!matchingKeywords.includes(area)) {
      const skillName = area.toLowerCase().trim();
      const category = categorizeSkill(skillName);
      const synonyms = getSkillSynonyms(skillName);
      
      verifiedSkills.push({
        skill: skillName.replace(' ', '_'),
        display_name: area,
        score: 50, // Lower score for improvement areas
        level: 'beginner',
        category: category,
        synonyms: synonyms,
        evidence: `Identified as area for improvement`,
        confidence: 0.5,
        mentioned_in_intro: true,
        job_relevance: 0.6
      });
    }
  });
  
  // Create searchable tags
  const searchableTags = [];
  verifiedSkills.forEach(skill => {
    searchableTags.push(skill.skill);
    searchableTags.push(skill.display_name.toLowerCase().replace(' ', '_'));
    skill.synonyms.forEach(synonym => {
      searchableTags.push(synonym.replace(' ', '_'));
    });
    searchableTags.push(`category_${skill.category}`);
  });
  
  const enhancedSkills = {
    verified_skills: verifiedSkills,
    competency_scores: competencyScores, // Keep original
    searchable_tags: [...new Set(searchableTags)], // Remove duplicates
    skill_summary: {
      total_skills: verifiedSkills.length,
      expert_skills: verifiedSkills.filter(s => s.level === 'expert').length,
      advanced_skills: verifiedSkills.filter(s => s.level === 'advanced').length,
      categories_covered: new Set(verifiedSkills.map(s => s.category)).size,
      average_score: verifiedSkills.length > 0 ? 
        Math.round(verifiedSkills.reduce((sum, s) => sum + s.score, 0) / verifiedSkills.length) : 0,
      job_relevant_skills: verifiedSkills.filter(s => s.job_relevance >= 0.7).length
    }
  };
  
  console.log(`   Created ${verifiedSkills.length} verified skills, ${searchableTags.length} searchable tags`);
  
  return enhancedSkills;
}

async function migrateInterviewsToEnhancedSkills() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    
    console.log('🚀 Starting migration to enhanced skills...');
    
    // Get all completed interviews without enhanced_skills
    const interviews = await db.collection('interviews').find({
      status: 'completed',
      enhanced_skills: { $exists: false }
    }).toArray();
    
    console.log(`📋 Found ${interviews.length} interviews to migrate`);
    
    if (interviews.length === 0) {
      console.log('✅ No interviews need migration');
      return;
    }
    
    let migrated = 0;
    let errors = 0;
    
    // Process interviews in batches
    const batchSize = 10;
    for (let i = 0; i < interviews.length; i += batchSize) {
      const batch = interviews.slice(i, i + batchSize);
      
      console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(interviews.length/batchSize)}`);
      
      const operations = [];
      
      for (const interview of batch) {
        try {
          console.log(`  Migrating interview ${interview._id} (${interview.role})`);
          
          // Create enhanced skills from legacy data
          const enhancedSkills = createEnhancedSkillsFromLegacy(interview);
          
          // Prepare update operation
          operations.push({
            updateOne: {
              filter: { _id: interview._id },
              update: {
                $set: {
                  enhanced_skills: enhancedSkills,
                  skill_extraction_version: 'v2.0_migrated',
                  migration_date: new Date()
                }
              }
            }
          });
          
          migrated++;
          
        } catch (error) {
          console.error(`  ❌ Error migrating interview ${interview._id}: ${error.message}`);
          errors++;
        }
      }
      
      // Execute batch operations
      if (operations.length > 0) {
        const result = await db.collection('interviews').bulkWrite(operations);
        console.log(`  ✅ Updated ${result.modifiedCount} interviews in batch`);
      }
    }
    
    console.log('\n🏁 Migration Summary:');
    console.log(`  ✅ Successfully migrated: ${migrated}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log(`  📊 Success rate: ${((migrated / interviews.length) * 100).toFixed(1)}%`);
    
    // Create indexes for performance
    console.log('\n🔍 Creating performance indexes...');
    
    await db.collection('interviews').createIndex(
      { "enhanced_skills.searchable_tags": 1, "role": 1, "status": 1 }
    );
    
    await db.collection('interviews').createIndex(
      { "enhanced_skills.verified_skills.category": 1 }
    );
    
    console.log('✅ Performance indexes created');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

async function validateMigration() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    
    console.log('\n🔍 Validating migration...');
    
    // Check migration statistics
    const totalInterviews = await db.collection('interviews').countDocuments({ status: 'completed' });
    const migratedInterviews = await db.collection('interviews').countDocuments({ 
      status: 'completed',
      enhanced_skills: { $exists: true }
    });
    
    console.log(`📊 Migration Statistics:`);
    console.log(`  Total completed interviews: ${totalInterviews}`);
    console.log(`  Migrated interviews: ${migratedInterviews}`);
    console.log(`  Migration coverage: ${((migratedInterviews / totalInterviews) * 100).toFixed(1)}%`);
    
    // Sample a few migrated interviews
    const samples = await db.collection('interviews').find({
      enhanced_skills: { $exists: true }
    }).limit(3).toArray();
    
    console.log('\n🔬 Sample Validation:');
    samples.forEach((sample, index) => {
      const enhancedSkills = sample.enhanced_skills;
      console.log(`  Sample ${index + 1} (${sample.role}):`);
      console.log(`    Verified skills: ${enhancedSkills.verified_skills?.length || 0}`);
      console.log(`    Searchable tags: ${enhancedSkills.searchable_tags?.length || 0}`);
      console.log(`    Average score: ${enhancedSkills.skill_summary?.average_score || 'N/A'}`);
      console.log(`    Categories: ${enhancedSkills.skill_summary?.categories_covered || 0}`);
    });
    
    console.log('\n✅ Migration validation complete');
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
  } finally {
    await client.close();
  }
}

// Run migration
async function runMigration() {
  try {
    await migrateInterviewsToEnhancedSkills();
    await validateMigration();
    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Export functions for use in other scripts
export { 
  migrateInterviewsToEnhancedSkills, 
  validateMigration,
  createEnhancedSkillsFromLegacy 
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration();
}