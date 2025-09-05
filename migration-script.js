// migration-script.js - Complete migration from genhrPORT-5000 to genhr
// Place in project root and run: node migration-script.js

const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb://localhost:27017';
const OLD_DB = 'genhrPORT-5000';  // Source (your current signup data)
const NEW_DB = 'genhr';            // Target (unified database)

async function migrateToUnifiedDatabase() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('🔌 Connected to MongoDB for migration');
    
    const oldDb = client.db(OLD_DB);
    const newDb = client.db(NEW_DB);
    
    // Step 1: Migrate detailed candidate profiles
    console.log('\n👤 Step 1: Migrating detailed candidate profiles...');
    
    const oldUsers = await oldDb.collection('users').find({ userType: 'candidate' }).toArray();
    const oldCandidates = await oldDb.collection('candidates').find().toArray();
    
    console.log(`Found ${oldUsers.length} candidate users and ${oldCandidates.length} candidate profiles`);
    
    let migratedCandidates = 0;
    
    for (const user of oldUsers) {
      try {
        // Find corresponding detailed candidate profile
        const candidateProfile = oldCandidates.find(c => 
          c.userId && c.userId.toString() === user._id.toString()
        );
        
        // Check if already migrated
        const existing = await newDb.collection('candidates').findOne({ email: user.email });
        if (existing) {
          console.log(`⏭️  ${user.email} already migrated`);
          continue;
        }
        
        // Map detailed profile to normalized schema
        const unifiedCandidate = {
          // Core fields
          name: candidateProfile?.fullName || user.email.split('@')[0],
          email: user.email,
          experience_years: candidateProfile?.experience ? parseInt(candidateProfile.experience) || 0 : 0,
          
          // Education mapping
          education: candidateProfile ? {
            degree: candidateProfile.degree || null,
            field: null, // Not captured in your form
            university: candidateProfile.university || null,
            graduation_year: candidateProfile.graduationYear || null
          } : null,
          
          // Extract certifications from skills if available
          certifications: candidateProfile?.skills ? 
            candidateProfile.skills.split(',').map(s => s.trim()).slice(0, 5) : [],
          
          // Job preferences (from detailed profile)
          job_preferences: candidateProfile ? {
            preferred_role: candidateProfile.preferredRole || candidateProfile.jobTitle,
            job_type: candidateProfile.jobType,
            skill_level: candidateProfile.skillLevel,
            expected_salary: candidateProfile.expectedSalary,
            current_location: candidateProfile.currentLocation,
            desired_locations: candidateProfile.desiredLocations || [],
            visa_status: candidateProfile.visaStatus
          } : {},
          
          // Professional links
          social_links: candidateProfile ? {
            linkedin: candidateProfile.linkedin,
            github: candidateProfile.github,
            previous_hr_email: candidateProfile.previousHrEmail
          } : {},
          
          // Work experience
          work_history: candidateProfile?.workExperience || [],
          
          // Personal info (optional)
          personal_info: candidateProfile ? {
            birth_year: candidateProfile.birthYear,
            gender: candidateProfile.gender,
            sexuality: candidateProfile.sexuality
          } : {},
          
          // Files
          documents: candidateProfile ? {
            govt_id: candidateProfile.govtId
          } : {},
          
          // Consent & compliance
          pii_consent: {
            accepted_at: candidateProfile?.createdAt || user.createdAt || new Date(),
            region: 'UK',
            retention_days: 730,
            consent_given: candidateProfile?.consent || false
          },
          
          // Timestamps
          created_at: user.createdAt || new Date(),
          updated_at: new Date(),
          last_login: user.lastLogin,
          
          // Migration tracking
          migrated_from: {
            user_id: user._id,
            candidate_id: candidateProfile?._id,
            migrated_at: new Date()
          }
        };
        
        const result = await newDb.collection('candidates').insertOne(unifiedCandidate);
        console.log(`✅ ${user.email} migrated -> ${result.insertedId}`);
        migratedCandidates++;
        
      } catch (error) {
        console.error(`❌ Failed to migrate candidate ${user.email}:`, error.message);
      }
    }
    
    // Step 2: Migrate recruiters with their profiles
    console.log('\n🏢 Step 2: Migrating recruiter profiles...');
    
    const oldRecruiterUsers = await oldDb.collection('users').find({ userType: 'recruiter' }).toArray();
    const oldRecruiters = await oldDb.collection('recruiters').find().toArray();
    
    let migratedRecruiters = 0;
    
    for (const user of oldRecruiterUsers) {
      try {
        const recruiterProfile = oldRecruiters.find(r => 
          r.userId && r.userId.toString() === user._id.toString()
        );
        
        const existing = await newDb.collection('recruiters').findOne({ email: user.email });
        if (existing) {
          console.log(`⏭️  Recruiter ${user.email} already migrated`);
          continue;
        }
        
        const unifiedRecruiter = {
          name: recruiterProfile?.recruiterName || user.email.split('@')[0],
          email: user.email,
          company: recruiterProfile?.companyName || 'Unknown Company',
          phone: recruiterProfile?.phone || null,
          created_at: user.createdAt || new Date(),
          updated_at: new Date(),
          last_login: user.lastLogin,
          migrated_from: {
            user_id: user._id,
            recruiter_id: recruiterProfile?._id,
            migrated_at: new Date()
          }
        };
        
        const result = await newDb.collection('recruiters').insertOne(unifiedRecruiter);
        console.log(`✅ Recruiter ${user.email} migrated -> ${result.insertedId}`);
        migratedRecruiters++;
        
      } catch (error) {
        console.error(`❌ Failed to migrate recruiter ${user.email}:`, error.message);
      }
    }
    
    // Step 3: Migrate job postings
    console.log('\n💼 Step 3: Migrating job postings...');
    
    const oldJobs = await oldDb.collection('jobs').find().toArray();
    let migratedJobs = 0;
    
    for (const job of oldJobs) {
      try {
        // Find corresponding recruiter in new database
        const originalRecruiter = await oldDb.collection('recruiters').findOne({ 
          _id: job.recruiterId 
        });
        
        let newRecruiterId = null;
        if (originalRecruiter) {
          const migratedRecruiter = await newDb.collection('recruiters').findOne({ 
            'migrated_from.recruiter_id': originalRecruiter._id 
          });
          newRecruiterId = migratedRecruiter?._id;
        }
        
        const unifiedJob = {
          title: job.title,
          location: job.location,
          mode: job.mode,
          type: job.type,
          visa_required: job.visa === 'Yes',
          required_skills: job.skills.split(',').map(s => s.trim().toLowerCase()),
          experience_required: job.experience,
          salary_range: job.salary,
          description: job.description,
          recruiter_id: newRecruiterId,
          is_active: job.isActive !== false,
          created_at: job.createdAt || new Date(),
          updated_at: new Date(),
          
          // For Phase 3 job matching
          skill_requirements: {
            programming_languages: [],
            tools: [],
            frameworks: [],
            concepts: []
          },
          matching_criteria: {
            min_experience_years: parseInt(job.experience) || 0,
            location_flexible: job.mode !== 'Onsite',
            salary_min: null,
            salary_max: null
          },
          
          migrated_from: {
            job_id: job._id,
            migrated_at: new Date()
          }
        };
        
        // Parse skills into categories (for job matching)
        const skillsLower = job.skills.toLowerCase();
        if (skillsLower.includes('python') || skillsLower.includes('sql') || skillsLower.includes('r')) {
          unifiedJob.skill_requirements.programming_languages = 
            ['python', 'sql', 'r'].filter(skill => skillsLower.includes(skill));
        }
        if (skillsLower.includes('power bi') || skillsLower.includes('tableau') || skillsLower.includes('excel')) {
          unifiedJob.skill_requirements.tools = 
            ['power bi', 'tableau', 'excel'].filter(tool => skillsLower.includes(tool));
        }
        
        const result = await newDb.collection('jobs').insertOne(unifiedJob);
        console.log(`✅ Job "${job.title}" migrated -> ${result.insertedId}`);
        migratedJobs++;
        
      } catch (error) {
        console.error(`❌ Failed to migrate job "${job.title}":`, error.message);
      }
    }
    
    // Step 4: Create unified auth collection
    console.log('\n🔐 Step 4: Creating unified authentication...');
    
    const allUsers = await oldDb.collection('users').find().toArray();
    let authMigrated = 0;
    
    for (const user of allUsers) {
      try {
        const existing = await newDb.collection('auth').findOne({ email: user.email });
        if (existing) continue;
        
        const authRecord = {
          email: user.email,
          password: user.password, // Keep hashed password
          user_type: user.userType,
          is_verified: user.isVerified || false,
          last_login: user.lastLogin,
          created_at: user.createdAt || new Date(),
          updated_at: new Date(),
          original_user_id: user._id
        };
        
        await newDb.collection('auth').insertOne(authRecord);
        authMigrated++;
        
      } catch (error) {
        console.error(`❌ Auth migration failed for ${user.email}:`, error.message);
      }
    }
    
    // Step 5: Verification and summary
    console.log('\n🔍 Step 5: Verifying migration...');
    
    const newCounts = {
      candidates: await newDb.collection('candidates').countDocuments(),
      recruiters: await newDb.collection('recruiters').countDocuments(),
      jobs: await newDb.collection('jobs').countDocuments(),
      auth: await newDb.collection('auth').countDocuments(),
      interviews: await newDb.collection('interviews').countDocuments(),
      skill_assessments: await newDb.collection('skill_assessments').countDocuments()
    };
    
    console.log('\n📈 Final counts in unified genhr database:');
    Object.entries(newCounts).forEach(([collection, count]) => {
      console.log(`   ${collection}: ${count}`);
    });
    
    // Show sample migrated data
    console.log('\n👥 Sample migrated candidates:');
    const sampleCandidates = await newDb.collection('candidates').find({}, 
      { name: 1, email: 1, 'job_preferences.preferred_role': 1 }).limit(5).toArray();
    
    sampleCandidates.forEach(candidate => {
      console.log(`   - ${candidate.name} (${candidate.email}) - ${candidate.job_preferences?.preferred_role || 'No role specified'}`);
    });
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Update backend/.env to use genhr database');
    console.log('2. Update backend models to work with unified schema');
    console.log('3. Test complete signup → interview → dashboard flow');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.close();
  }
}

// Run the migration
migrateToUnifiedDatabase().catch(console.error);

// ==========================================
// UPDATED BACKEND CONFIGURATION
// ==========================================

/*
UPDATE YOUR backend/.env FILE TO:

MONGO_URI=mongodb://localhost:27017
DB_NAME=genhr
JWT_SECRET=genHr_secret_dissertation_$2025_@DABI
OPENAI_API_KEY=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

*/