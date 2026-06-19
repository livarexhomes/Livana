import React, { useState } from 'react';

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 py-6">
      <button
        className="flex w-full items-center justify-between text-left focus:outline-none group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">{question}</span>
        <span className="ml-6 flex-shrink-0">
          <div className={`p-1 rounded-full border border-gray-300 transition-all duration-200 ${isOpen ? 'bg-blue-600 border-blue-600 rotate-180' : 'bg-transparent'}`}>
            <svg
              className={`h-5 w-5 ${isOpen ? 'text-white' : 'text-gray-500'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </span>
      </button>
      {isOpen && (
        <div className="mt-4 text-base text-gray-600 leading-relaxed animate-fadeIn">
          {answer}
        </div>
      )}
    </div>
  );
};

const FAQPage = () => {
  const categories = [
    {
      title: 'General',
      questions: [
        {
          question: 'What is Livarex?',
          answer: 'Livarex is Nigeria\'s verified property marketplace. We connect tenants with verified landlords to ensure a safe, transparent, and stress-free rental and property acquisition process.',
        },
        {
          question: 'Is Livarex available nationwide?',
          answer: 'Currently, we have a strong presence in Lagos and Ogun states. We are rapidly expanding to Abuja, Port Harcourt, and other major cities across Nigeria soon.',
        },
        {
          question: 'Is it free to use Livarex?',
          answer: 'Searching for properties and browsing listings on Livarex is completely free for tenants. Landlords and agents may have specific service plans for listing their properties.',
        },
      ],
    },
    {
      title: 'For Tenants',
      questions: [
        {
          question: 'How do I know a property is verified?',
          answer: 'Every property on Livarex goes through a rigorous verification process. We verify the landlord\'s government ID, authenticate their phone number, and review property ownership documents before any listing goes live.',
        },
        {
          question: 'How can I book an inspection?',
          answer: 'Once you find a property you like, click the "Book Inspection" button. Our team will coordinate with the landlord and schedule a convenient time for you to view the home.',
        },
        {
          question: 'Are there hidden charges?',
          answer: 'No. Livarex believes in transparent pricing. All fees, including rent and any applicable service charges, are clearly stated upfront.',
        },
      ],
    },
    {
      title: 'For Landlords & Agents',
      questions: [
        {
          question: 'How do I list my property on Livarex?',
          answer: 'To list your property, you need to create an account and submit your property details along with the required verification documents (ID and ownership proof). Our admin team will review and approve it within 24-48 hours.',
        },
        {
          question: 'What are the benefits of listing on Livarex?',
          answer: 'Livarex provides access to a pool of pre-screened, serious tenants. Our platform handles the initial filtering and scheduling, saving you time and ensuring you deal with quality prospects.',
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Banner Section */}
      <div className="relative bg-[#0052cc] py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Decorative background SVG patterns */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 opacity-10 pointer-events-none">
          <svg width="404" height="384" fill="none" viewBox="0 0 404 384">
            <defs>
              <pattern id="pattern-hero" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width="4" height="4" className="text-white" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="404" height="384" fill="url(#pattern-hero)" />
          </svg>
        </div>
        
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl mb-4">
            FAQ
          </h1>
          <div className="h-1.5 w-24 bg-white mx-auto rounded-full mb-8"></div>
          <div className="max-w-2xl mx-auto">
            <p className="text-xl md:text-2xl text-blue-50 font-medium">
              Find answers to common questions about Nigeria's most trusted property marketplace.
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Content Section */}
      <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="space-y-16">
          {categories.map((category) => (
            <div key={category.title} className="bg-gray-50 rounded-2xl p-6 md:p-10 border border-gray-100 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
                <span className="w-2 h-8 bg-blue-600 rounded-full mr-4"></span>
                {category.title}
              </h2>
              <div className="divide-y divide-gray-200">
                {category.questions.map((faq, index) => (
                  <FAQItem key={index} question={faq.question} answer={faq.answer} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Support Section */}
        <div className="mt-20 bg-gray-900 rounded-3xl p-10 md:p-16 text-center text-white relative overflow-hidden">
           {/* Visual accent */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-600 rounded-full blur-[100px] opacity-20"></div>
          
          <div className="relative z-10">
            <h3 className="text-3xl font-bold mb-4">Still have questions?</h3>
            <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
              Our team is ready to help you navigate your property search or listing process. Reach out to us anytime.
            </p>
            <a
              href="https://www.livarex.com.ng/contact"
              className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold px-10 py-4 rounded-xl transition-all hover:scale-105 shadow-lg shadow-blue-900/20"
            >
              Contact Support
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default FAQPage;
