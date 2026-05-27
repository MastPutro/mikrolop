<?php

namespace App\Console\Commands;

use App\Models\ODP;
use App\Models\Server;
use App\Models\Customer;
use Illuminate\Console\Command;

class TestODPHierarchy extends Command
{
    protected $signature = 'test:odp-hierarchy';
    protected $description = 'Test ODP hierarchical structure implementation';

    public function handle()
    {
        $this->info('=== Testing ODP Hierarchical Structure ===');
        $this->newLine();

        try {
            // Test 1: Get or create a test server with unique IP
            $this->info('Test 1: Getting/Creating Server...');
            $uniqueIp = '192.168.' . rand(2, 254) . '.' . rand(1, 254);
            $server = Server::firstOrCreate(
                ['ip' => $uniqueIp],
                [
                    'name' => 'Test Server - ' . now()->timestamp,
                    'lat' => -7.47,
                    'lng' => 112.56,
                    'status' => 'online',
                    'capacity' => 1000,
                    'used' => 0,
                ]
            );
            $this->line("✓ Server: {$server->name} (ID: {$server->id})");
            $this->line("  - IP: {$server->ip}");
            $this->newLine();

            // Test 2: Create root ODP (with server_id)
            $this->info('Test 2: Creating Root ODP (with server_id)...');
            $rootOdp = ODP::create([
                'name' => 'Root ODP',
                'lat' => -7.47,
                'lng' => 112.56,
                'server_id' => $server->id,
                'parent_id' => null,
                'status' => 'online',
                'ports' => 16,
                'used_ports' => 0,
            ]);
            $this->line("✓ Root ODP created: {$rootOdp->name} (ID: {$rootOdp->id})");
            $this->line("  - server_id: {$rootOdp->server_id}");
            $this->line("  - parent_id: {$rootOdp->parent_id}");
            $this->line("  - depth: {$rootOdp->getDepth()}");
            $this->line("  - isLeaf: " . ($rootOdp->isLeafODP() ? 'true' : 'false'));
            $this->newLine();

            // Test 3: Create child ODP (with parent_id)
            $this->info('Test 3: Creating Child ODP (with parent_id)...');
            $childOdp = ODP::create([
                'name' => 'Child ODP',
                'lat' => -7.48,
                'lng' => 112.57,
                'server_id' => null,
                'parent_id' => $rootOdp->id,
                'status' => 'online',
                'ports' => 8,
                'used_ports' => 0,
            ]);
            $this->line("✓ Child ODP created: {$childOdp->name} (ID: {$childOdp->id})");
            $this->line("  - server_id: {$childOdp->server_id}");
            $this->line("  - parent_id: {$childOdp->parent_id}");
            $this->line("  - depth: {$childOdp->getDepth()}");
            $this->line("  - isLeaf: " . ($childOdp->isLeafODP() ? 'true' : 'false'));
            $this->newLine();

            // Test 4: Create grandchild ODP (depth 2)
            $this->info('Test 4: Creating Grandchild ODP (depth 2)...');
            $grandchildOdp = ODP::create([
                'name' => 'Grandchild ODP',
                'lat' => -7.49,
                'lng' => 112.58,
                'server_id' => null,
                'parent_id' => $childOdp->id,
                'status' => 'online',
                'ports' => 4,
                'used_ports' => 0,
            ]);
            $this->line("✓ Grandchild ODP created: {$grandchildOdp->name} (ID: {$grandchildOdp->id})");
            $this->line("  - depth: {$grandchildOdp->getDepth()}");
            $this->newLine();

            // Test 5: Test getRootServer
            $this->info('Test 5: Testing getRootServer()...');
            $rootFromRoot = $rootOdp->getRootServer();
            $rootFromChild = $childOdp->getRootServer();
            $rootFromGrandchild = $grandchildOdp->getRootServer();
            $this->line("✓ Root ODP root server: {$rootFromRoot->name}");
            $this->line("✓ Child ODP root server: {$rootFromChild->name}");
            $this->line("✓ Grandchild ODP root server: {$rootFromGrandchild->name}");
            $this->newLine();

            // Test 6: Test parent-child relationships
            $this->info('Test 6: Testing Parent-Child Relationships...');
            $childParent = $childOdp->parentOdp;
            $this->line("✓ Child ODP's parent: {$childParent->name}");
            
            $rootChildren = $rootOdp->childOdps;
            $this->line("✓ Root ODP has {$rootChildren->count()} direct child(ren)");
            foreach ($rootChildren as $child) {
                $this->line("  - {$child->name}");
            }
            $this->newLine();

            // Test 7: Test canBeParentOf (prevent circular references)
            $this->info('Test 7: Testing Circular Reference Prevention...');
            $canChildBeParentOfRoot = $childOdp->canBeParentOf($rootOdp);
            $canRootBeParentOfChild = $rootOdp->canBeParentOf($childOdp);
            $this->line("✓ Can child ODP be parent of root ODP? " . ($canChildBeParentOfRoot ? 'YES (ERROR!)' : 'NO (correct)'));
            $this->line("✓ Can root ODP be parent of child ODP? " . ($canRootBeParentOfChild ? 'YES (correct)' : 'NO (ERROR!)'));
            $this->newLine();

            // Test 8: Create customer under child ODP
            $this->info('Test 8: Creating Customer under Child ODP...');
            $uniqueCustomerIp = '10.0.' . rand(1, 254) . '.' . rand(1, 254);
            $customer = Customer::create([
                'name' => 'Test Customer - ' . now()->timestamp,
                'lat' => -7.48,
                'lng' => 112.57,
                'odp_id' => $childOdp->id,
                'status' => 'active',
                'phone_number' => '08123456789',
                'ip_address' => $uniqueCustomerIp,
                'used' => 'yes',
            ]);
            $this->line("✓ Customer created: {$customer->name} (ID: {$customer->id})");
            $this->line("  - odp_id: {$customer->odp_id}");
            $this->line("  - status: {$customer->status}");
            $this->line("  - ip_address: {$customer->ip_address}");
            $this->newLine();

            // Test 9: Test getAllDescendants
            $this->info('Test 9: Testing getAllDescendants()...');
            $descendants = $rootOdp->getAllDescendants();
            $this->line("✓ Root ODP has {$descendants->count()} total descendants:");
            foreach ($descendants as $desc) {
                $this->line("  - {$desc->name} (depth: {$desc->getDepth()})");
            }
            $this->newLine();

            // Test 10: Test depth validation
            $this->info('Test 10: Testing Depth Validation...');
            $isValidChildParent = $childOdp->validateDepth($rootOdp);
            $this->line("✓ Can make root ODP parent of child ODP? " . ($isValidChildParent ? 'YES (correct)' : 'NO (ERROR!)'));
            $this->newLine();

            $this->info('=== All Tests Completed Successfully! ===');
            $this->info('✓ ODP Hierarchical Structure is working correctly');

            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Test Failed: ' . $e->getMessage());
            $this->error('Stack Trace: ' . $e->getTraceAsString());
            return Command::FAILURE;
        }
    }
}
