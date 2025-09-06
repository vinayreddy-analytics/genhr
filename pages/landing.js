"use client";

import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center">
            {/* Logo and Brand */}
            <div className="mb-16 flex items-center justify-center">
              <h1 className="text-5xl sm:text-6xl font-extrabold">
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Gen
                </span>
                <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                  HR
                </span>
              </h1>
            </div>

            {/* Main Slogans - Side by Side */}
            <div className="mb-16">
              <div className="flex flex-col lg:flex-row justify-center items-center gap-4 lg:gap-8 text-2xl sm:text-3xl lg:text-4xl font-bold">
                <span className="text-gray-900">Intelligent Hiring.</span>
                <span className="text-indigo-600">Zero Resumes.</span>
                <span className="text-gray-900">Perfect Matches.</span>
              </div>
            </div>
            
            <p className="mx-auto max-w-4xl text-xl sm:text-2xl text-gray-600 mb-16 leading-relaxed">
              Let AI analyze skills, verify experience, and deliver pre-qualified talent directly to 
              you — <span className="font-semibold text-indigo-600">streamlined, smart, and bias-free.</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-6 mb-12">
              <Link href="/recruiter-form">
                <button className="group relative px-10 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 text-xl">
                  <span className="flex items-center justify-center gap-3">
                    💼 I'm a Recruiter
                  </span>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-700 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </button>
              </Link>
              
              <Link href="/candidate-form">
                <button className="group relative px-10 py-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 text-xl">
                  <span className="flex items-center justify-center gap-3">
                    🎯 I'm a Candidate
                  </span>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </button>
              </Link>
            </div>

            {/* Sign In Link */}
            <div className="text-center">
              <Link href="/login">
                <span className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-700 font-medium rounded-lg shadow-md hover:shadow-lg border border-gray-200 hover:border-gray-300 transition-all duration-200 cursor-pointer text-lg">
                  <span>Already have an account?</span>
                  <span className="text-indigo-600 font-semibold">Sign In →</span>
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* Background Decorations */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-indigo-200 rounded-full opacity-20 animate-pulse"></div>
          <div className="absolute top-40 right-10 w-20 h-20 bg-purple-200 rounded-full opacity-20 animate-pulse delay-1000"></div>
          <div className="absolute bottom-20 left-1/4 w-16 h-16 bg-emerald-200 rounded-full opacity-20 animate-pulse delay-2000"></div>
        </div>
      </div>

      {/* How It Works Section */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How GenHR Works
            </h2>
            <p className="max-w-3xl mx-auto text-lg text-gray-600 leading-relaxed">
              Our intelligent system eliminates traditional resume screening and focuses on what really 
              matters — <span className="font-semibold text-indigo-600">skills and compatibility.</span>
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="group relative bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl hover:border-indigo-200 transition-all duration-300 transform hover:-translate-y-2">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg">
                  1
                </div>
              </div>
              <div className="pt-6 text-center">
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-indigo-200 transition-colors">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Smart Profile Creation</h3>
                <p className="text-gray-600 leading-relaxed">
                  Answer key questions and let AI understand your skills and requirements automatically.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="group relative bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl hover:border-indigo-200 transition-all duration-300 transform hover:-translate-y-2">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg">
                  2
                </div>
              </div>
              <div className="pt-6 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-emerald-200 transition-colors">
                  <span className="text-2xl">🤖</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">AI-Powered Matching</h3>
                <p className="text-gray-600 leading-relaxed">
                  Our advanced algorithms analyze compatibility and match recruiters with ideal candidates.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="group relative bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl hover:border-indigo-200 transition-all duration-300 transform hover:-translate-y-2">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg">
                  3
                </div>
              </div>
              <div className="pt-6 text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-purple-200 transition-colors">
                  <span className="text-2xl">🔗</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Seamless Connection</h3>
                <p className="text-gray-600 leading-relaxed">
                  Get connected directly with verified matches and track your recruitment progress.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Experience Section - Replacing Fake Stats */}
      <section className="py-16 sm:py-24 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            Experience the Future of Hiring
          </h3>
          <p className="max-w-2xl mx-auto text-lg text-gray-600 mb-12 leading-relaxed">
            See how AI interviews revolutionize talent discovery with our innovative approach
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <div className="group bg-white rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-4xl md:text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">📄</div>
              <div className="text-lg md:text-xl font-bold text-gray-900 mb-2">No Resume</div>
              <div className="text-sm md:text-base text-gray-600">Required</div>
            </div>
            
            <div className="group bg-white rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-4xl md:text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">⏱️</div>
              <div className="text-lg md:text-xl font-bold text-gray-900 mb-2">10-Minute</div>
              <div className="text-sm md:text-base text-gray-600">AI Interviews</div>
            </div>
            
            <div className="group bg-white rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-4xl md:text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">🎯</div>
              <div className="text-lg md:text-xl font-bold text-gray-900 mb-2">Skills-Based</div>
              <div className="text-sm md:text-base text-gray-600">Matching</div>
            </div>
            
            <div className="group bg-white rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-4xl md:text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">⚖️</div>
              <div className="text-lg md:text-xl font-bold text-gray-900 mb-2">Bias-Free</div>
              <div className="text-sm md:text-base text-gray-600">Assessment</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 sm:py-20 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Hiring?
          </h3>
          <p className="text-xl text-gray-300 mb-10 leading-relaxed">
            Join the AI revolution in talent discovery and find your perfect matches today.
          </p>
          <Link href="/recruiter-form">
            <button className="px-10 py-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 text-xl">
              Get Started Free
            </button>
          </Link>
        </div>
      </section>

      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button className="group w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 flex items-center justify-center">
          <span className="text-2xl group-hover:animate-bounce">💬</span>
        </button>
      </div>
    </main>
  );
}