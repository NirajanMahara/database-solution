import React, { useState, useEffect } from 'react';
import { Plus, Settings, Users, FileText, Folder, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/database.types';

type Organization = Database['public']['Tables']['organizations']['Row'];
type Project = Database['public']['Tables']['projects']['Row'];
type Document = Database['public']['Tables']['documents']['Row'];

export function Dashboard() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isNewOrgModalOpen, setIsNewOrgModalOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isNewDocModalOpen, setIsNewDocModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchOrganizations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedOrg) {
      fetchProjects(selectedOrg);
    }
  }, [selectedOrg]);

  const fetchOrganizations = async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching organizations:', error);
      return;
    }
    
    setOrganizations(data);
    if (data.length > 0 && !selectedOrg) {
      setSelectedOrg(data[0].id);
    }
  };

  const fetchProjects = async (orgId: string) => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('organization_id', orgId)
      .order('name');
    
    if (error) {
      console.error('Error fetching projects:', error);
      return;
    }
    
    setProjects(data);
  };

  const createOrganization = async (name: string) => {
    const { error } = await supabase
      .from('organizations')
      .insert([{ name }]);
    
    if (error) {
      console.error('Error creating organization:', error);
      return;
    }
    
    fetchOrganizations();
    setIsNewOrgModalOpen(false);
  };

  const createProject = async (name: string, description: string) => {
    if (!selectedOrg) return;

    const { error } = await supabase
      .from('projects')
      .insert([{
        name,
        description,
        organization_id: selectedOrg
      }]);
    
    if (error) {
      console.error('Error creating project:', error);
      return;
    }
    
    fetchProjects(selectedOrg);
    setIsNewProjectModalOpen(false);
  };

  const createDocument = async (projectId: string, name: string, content: string) => {
    const { error } = await supabase
      .from('documents')
      .insert([{
        name,
        content,
        project_id: projectId,
        created_by: user?.id
      }]);
    
    if (error) {
      console.error('Error creating document:', error);
      return;
    }
    
    setIsNewDocModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Shield className="h-8 w-8 text-indigo-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">Refined Stack Co.</span>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => setIsNewOrgModalOpen(true)}
                className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Organization
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="col-span-3">
            <div className="bg-white shadow rounded-lg">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Organizations</h2>
              </div>
              <ul className="divide-y divide-gray-200">
                {organizations.map((org) => (
                  <li
                    key={org.id}
                    className={`cursor-pointer hover:bg-gray-50 ${
                      selectedOrg === org.id ? 'bg-gray-50' : ''
                    }`}
                    onClick={() => setSelectedOrg(org.id)}
                  >
                    <div className="px-4 py-4 flex items-center">
                      <Folder className="h-5 w-5 text-gray-400" />
                      <span className="ml-3 text-sm font-medium text-gray-900">
                        {org.name}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Main content */}
          <div className="col-span-9">
            <div className="bg-white shadow rounded-lg">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Projects</h2>
                {selectedOrg && (
                  <button
                    onClick={() => setIsNewProjectModalOpen(true)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Project
                  </button>
                )}
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="focus:outline-none">
                          <span className="absolute inset-0" aria-hidden="true" />
                          <p className="text-sm font-medium text-gray-900">{project.name}</p>
                          <p className="text-sm text-gray-500 truncate">{project.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isNewOrgModalOpen && (
        <NewOrganizationModal
          onClose={() => setIsNewOrgModalOpen(false)}
          onCreate={createOrganization}
        />
      )}
      {isNewProjectModalOpen && (
        <NewProjectModal
          onClose={() => setIsNewProjectModalOpen(false)}
          onCreate={createProject}
        />
      )}
    </div>
  );
}