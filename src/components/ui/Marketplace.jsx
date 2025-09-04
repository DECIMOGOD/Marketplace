'use client'

import React, { useState, useEffect } from 'react';
import { Search, MessageCircle, Bell, User, Upload, X, ArrowLeft } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const Marketplace = () => {
  const [currentView, setCurrentView] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedListing, setSelectedListing] = useState(null);
  const [listings, setListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    category: '',
    location: 'Palo Alto, CA',
    seller_email: '',
    description: '',
    image_file: null,
    image_url: ''
  });

  const [messageData, setMessageData] = useState({
    buyer_email: '',
    message: ''
  });

  const categories = [
    'All', 'Vehicles', 'Property Rentals', 'Apparel', 'Classifieds', 'Electronics',
    'Entertainment', 'Family', 'Free Stuff', 'Garden & Outdoor', 'Hobbies',
    'Home Goods', 'Home Improvement', 'Home Sales', 'Musical Instruments',
    'Office Supplies', 'Pet Supplies', 'Sporting Goods', 'Toys & Games',
    'Buy and sell groups'
  ];

  const listingTypes = [
    { id: 'item', title: 'Item for sale', description: 'Sell anything from electronics to furniture' },
    { id: 'multiple', title: 'Create multiple listings', description: 'Upload multiple items at once' },
    { id: 'vehicle', title: 'Vehicle for sale', description: 'Cars, bikes, motorcycles and more' },
    { id: 'home', title: 'Home for sale or rent', description: 'Properties and rental listings' }
  ];

  // Test Supabase connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('Testing Supabase connection...');
        console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
        console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Present' : 'Missing');
        
        // First, try a simple select query instead of count
        const { data, error } = await supabase
          .from('listings')
          .select('id')
          .limit(1);
        
        if (error) {
          console.error('Supabase connection error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            fullError: error
          });
        } else {
          console.log('Supabase connected successfully');
          console.log('Test query result:', data);
        }
      } catch (err) {
        console.error('Connection test failed with exception:', err);
      }
    };
    
    testConnection();
    loadListings();
  }, []);

  // Load listings from Supabase
  const loadListings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setListings(data || []);
      console.log('Loaded listings:', data?.length || 0);
    } catch (error) {
      console.error('Error loading listings:', error);
      // Fall back to empty array if there's an error
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter listings when category or search changes
  useEffect(() => {
    filterListings();
  }, [listings, selectedCategory, searchQuery]);

  const filterListings = () => {
    let filtered = listings;
    
    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(listing => listing.category === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(listing =>
        listing.title.toLowerCase().includes(query) ||
        listing.description.toLowerCase().includes(query) ||
        listing.category.toLowerCase().includes(query)
      );
    }
    
    setFilteredListings(filtered);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      
      setFormData(prev => ({ 
        ...prev, 
        image_file: file,
        image_url: URL.createObjectURL(file)
      }));
    }
  };

  const handleCreateListing = async () => {
    // Validate required fields
    if (!formData.title || !formData.description || !formData.price || !formData.category || !formData.seller_email) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.seller_email)) {
      alert('Please enter a valid email address');
      return;
    }

    setLoading(true);
    
    try {
      // Upload image if present
      let image_url = '';
      if (formData.image_file) {
        const fileExt = formData.image_file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('listing-images')
          .upload(fileName, formData.image_file);
        
        if (uploadError) {
          console.error('Image upload error:', uploadError);
          // Continue without image if upload fails
        } else {
          const { data: publicUrl } = supabase.storage
            .from('listing-images')
            .getPublicUrl(fileName);
          
          image_url = publicUrl.publicUrl;
        }
      }

      // Insert listing into database
      const { data, error } = await supabase
        .from('listings')
        .insert([{
          title: formData.title,
          description: formData.description,
          price: parseFloat(formData.price),
          category: formData.category,
          location: formData.location,
          seller_email: formData.seller_email,
          image_url: image_url || null
        }])
        .select();

      if (error) throw error;

      console.log('Listing created:', data);

      // Reset form
      setFormData({
        title: '',
        price: '',
        category: '',
        location: 'Palo Alto, CA',
        seller_email: '',
        description: '',
        image_file: null,
        image_url: ''
      });

      setCurrentView('home');
      
      // Reload listings to include the new one
      await loadListings();
      
      alert('Listing created successfully!');
      
    } catch (error) {
      console.error('Error creating listing:', error);
      alert('Failed to create listing: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedListing || !messageData.buyer_email || !messageData.message) {
      alert('Please fill in all message fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(messageData.buyer_email)) {
      alert('Please enter a valid email address');
      return;
    }

    setLoading(true);
    
    try {
      // Save message to database
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          listing_id: selectedListing.id,
          buyer_email: messageData.buyer_email,
          seller_email: selectedListing.seller_email,
          message: messageData.message
        }])
        .select();

      if (error) throw error;

      console.log('Message saved:', data);

      setMessageSent(true);
      setMessageData({ buyer_email: '', message: '' });
      
      setTimeout(() => {
        setMessageSent(false);
      }, 5000);
      
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const renderHome = () => (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200">
        <div className="p-4">
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">Create new listing</h2>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 cursor-pointer" onClick={() => setCurrentView('choose-type')}>
                <span className="text-sm">📝</span>
                <span className="text-sm">Choose listing type</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 cursor-pointer">
                <span className="text-sm">📋</span>
                <span className="text-sm">Your listings</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 cursor-pointer">
                <span className="text-sm">❓</span>
                <span className="text-sm">Seller help</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium mb-3">Categories</h3>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {categories.map(category => (
                <div
                  key={category}
                  className={`text-sm px-2 py-1 rounded cursor-pointer ${
                    selectedCategory === category
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <h1 className="text-xl font-semibold">Marketplace</h1>
            </div>
            <div className="flex items-center space-x-4">
              <MessageCircle className="w-5 h-5 text-gray-600 cursor-pointer hover:text-blue-600" />
              <Bell className="w-5 h-5 text-gray-600 cursor-pointer hover:text-blue-600" />
              <User className="w-5 h-5 text-gray-600 cursor-pointer hover:text-blue-600" />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {selectedCategory === 'All' ? 'All Listings' : selectedCategory}
                {searchQuery && ` - "${searchQuery}"`}
                <span className="text-sm font-normal text-gray-500 ml-2">({filteredListings.length} items)</span>
              </h2>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search listings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64"
                  />
                </div>
                <button 
                  onClick={loadListings}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>

            {/* Listing Grid */}
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-gray-500">Loading listings...</div>
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500 mb-2">No listings found</div>
                <div className="text-sm text-gray-400">
                  {searchQuery || selectedCategory !== 'All' ? 'Try adjusting your search terms or category' : 'Be the first to create a listing!'}
                </div>
                {(searchQuery || selectedCategory !== 'All') && (
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                    }}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredListings.map(listing => (
                  <div
                    key={listing.id}
                    className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedListing(listing)}
                  >
                    <div className="w-full h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
                      {listing.image_url ? (
                        <img 
                          src={listing.image_url} 
                          alt={listing.title}
                          className="w-full h-full object-cover rounded-t-lg"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 rounded-t-lg flex items-center justify-center">
                          <span className="text-white text-4xl">📦</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xl font-bold">${listing.price}</span>
                      </div>
                      <h3 className="font-medium text-gray-900 mb-1 truncate">{listing.title}</h3>
                      <p className="text-sm text-gray-500 mb-1">{formatTimeAgo(listing.created_at)}</p>
                      <p className="text-sm text-gray-500">{listing.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderChooseType = () => (
    <div className="flex h-screen bg-gray-50">
      <div className="w-full">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setCurrentView('home')}
                className="text-blue-600 hover:text-blue-700 flex items-center space-x-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <h1 className="text-xl font-semibold">Marketplace</h1>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-8">Choose listing type</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {listingTypes.map(type => (
                <div
                  key={type.id}
                  className="bg-white rounded-lg p-6 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setCurrentView('create-form')}
                >
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-gray-400 text-2xl">📦</span>
                  </div>
                  <h3 className="font-semibold text-center mb-2">{type.title}</h3>
                  <p className="text-sm text-gray-500 text-center">{type.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCreateForm = () => (
    <div className="flex h-screen bg-gray-50">
      <div className="w-full">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setCurrentView('choose-type')}
                className="text-blue-600 hover:text-blue-700 flex items-center space-x-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <h1 className="text-xl font-semibold">Create Listing</h1>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex overflow-hidden" style={{ height: 'calc(100vh - 73px)' }}>
          {/* Form Section */}
          <div className="w-1/2 p-8 overflow-y-auto">
            <div className="space-y-6">
              {/* Photos */}
              <div>
                <label className="block text-sm font-medium mb-2">Photos</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload}
                    className="hidden" 
                    id="photo-upload" 
                  />
                  <label htmlFor="photo-upload" className="cursor-pointer">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Upload className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-gray-600">
                      <div className="font-medium mb-1">Add photos</div>
                      <div className="text-sm">JPEG, PNG, or WebP (max 5MB)</div>
                    </div>
                  </label>
                </div>
                
                {/* Preview uploaded image */}
                {formData.image_url && (
                  <div className="mt-4 relative inline-block">
                    <img 
                      src={formData.image_url} 
                      alt="Preview" 
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                    <button 
                      onClick={() => setFormData(prev => ({ ...prev, image_file: null, image_url: '' }))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="What are you selling?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium mb-2">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.filter(cat => cat !== 'All').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium mb-2">Price *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  placeholder="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Contact Email */}
              <div>
                <label className="block text-sm font-medium mb-2">Contact Email *</label>
                <input
                  type="email"
                  value={formData.seller_email}
                  onChange={(e) => handleInputChange('seller_email', e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your item in detail..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <button
                onClick={handleCreateListing}
                disabled={loading || !formData.title || !formData.description || !formData.price || !formData.category || !formData.seller_email}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Listing'}
              </button>
            </div>
          </div>

          {/* Preview Section */}
          <div className="w-1/2 bg-gray-100 p-8 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-6">Preview</h3>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center mb-4">
                {formData.image_url ? (
                  <img 
                    src={formData.image_url} 
                    alt="Preview" 
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-6xl">📦</span>
                  </div>
                )}
              </div>
              
              <h2 className="text-xl font-bold mb-2">{formData.title || 'Item Title'}</h2>
              <div className="text-2xl font-bold mb-4">${formData.price || '0'}</div>
              
              <div className="space-y-2 text-sm text-gray-600 mb-6">
                <div>Listed just now</div>
                <div>in {formData.location}</div>
                {formData.category && <div>Category: {formData.category}</div>}
              </div>
              
              {formData.description && (
                <div className="mb-6">
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-gray-700">{formData.description}</p>
                </div>
              )}
              
              <div>
                <h4 className="font-medium mb-2">Seller Information</h4>
                <p className="text-gray-600">{formData.seller_email || 'seller@email.com'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderListingDetail = () => (
    <div className="flex h-screen bg-gray-50">
      <div className="w-full">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setSelectedListing(null)}
                className="text-blue-600 hover:text-blue-700 flex items-center space-x-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Marketplace</span>
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <h1 className="text-xl font-semibold">Marketplace</h1>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex p-8 max-w-6xl mx-auto overflow-y-auto" style={{ height: 'calc(100vh - 73px)' }}>
          {/* Image */}
          <div className="w-1/2 pr-8">
            <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
              {selectedListing.image_url ? (
                <img 
                  src={selectedListing.image_url} 
                  alt={selectedListing.title}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-8xl">📦</span>
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="w-1/2">
            <h1 className="text-2xl font-bold mb-2">{selectedListing.title}</h1>
            <div className="text-3xl font-bold mb-4">${selectedListing.price}</div>
            
            <div className="space-y-2 text-gray-600 mb-6">
              <div>{formatTimeAgo(selectedListing.created_at)}</div>
              <div>in {selectedListing.location}</div>
              <div>Category: {selectedListing.category}</div>
            </div>
            
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{selectedListing.description}</p>
            </div>
            
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Seller Information</h3>
              <p className="text-gray-600">{selectedListing.seller_email}</p>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold">Message Seller</h3>
              
              {messageSent ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-green-800 font-medium">Message saved successfully!</div>
                  <div className="text-green-600">Your message has been stored and the seller can view it.</div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Your Email</label>
                    <input
                      type="email"
                      value={messageData.buyer_email}
                      onChange={(e) => setMessageData(prev => ({ ...prev, buyer_email: e.target.value }))}
                      placeholder="your@email.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Message</label>
                    <textarea
                      value={messageData.message}
                      onChange={(e) => setMessageData(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Hi! I'm interested in your item. Is it still available?"
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <button
                    onClick={handleSendMessage}
                    disabled={loading || !messageData.buyer_email || !messageData.message}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : 'Send Message'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Main render logic
  if (selectedListing) {
    return renderListingDetail();
  }

  switch (currentView) {
    case 'choose-type':
      return renderChooseType();
    case 'create-form':
      return renderCreateForm();
    default:
      return renderHome();
  }
};

export default Marketplace;