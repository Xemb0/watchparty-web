package com.autotech.watchparty

import com.autotech.watchparty.log.Log
import android.Manifest
import android.app.AlertDialog
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.view.WindowInsetsController
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.lifecycleScope
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.autotech.watchparty.database.models.DraggableButton
import com.autotech.watchparty.database.repository.WxProfile
import com.autotech.watchparty.ui.theme.WatchpartyTheme
import com.autotech.watchparty.utils.NavGamePadScreen
import com.autotech.watchparty.utils.NavScanQrScreen
import com.autotech.watchparty.utils.ObserveAsEvents
import com.autotech.watchparty.utils.SnackBarController
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import org.koin.androidx.viewmodel.ext.android.getViewModel
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {



//    private val myRepo by inject<MainRepository>()
//    private val myRepo = get<MainRepository>()

    private val permissions = arrayOf(
        Manifest.permission.CAMERA
    )
    @Inject
    lateinit var buttonDao: DraggableButtonDao
    @Inject lateinit var firstLaunchDao: FirstLaunchDao
    private val gamePadViewModel: GamePadViewModel by viewModels()
    private val connectionViewModel: ConnectionViewModel by viewModels()
//    private val sharedViewModel: SharedViewModel by viewModels()
//    private val scanViewModel:ScanViewModel by viewModels()
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
     val sharedViewModel =  getViewModel<SharedViewModel>()

    WindowCompat.setDecorFitsSystemWindows(window, false)

    // Use WindowInsetsController to hide system bars
    // Set full-screen mode based on API level
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        // For Android R and above
        window.insetsController?.apply {
            systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            hide(android.view.WindowInsets.Type.systemBars())
        }
    } else {
        // For Android Q and below
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_FULLSCREEN or
                        View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                )
    }

    requestPermissionsIfNeeded()
        lifecycleScope.launch {
            if (firstLaunchDao.getFirstLaunch() == null || firstLaunchDao.getFirstLaunch()?.isFirstLaunch == true) {
                val defaultButtons = listOf(
                    DraggableButton(key = "up", x = 0.31f, y = 0.51f, height = 0.7f, width = 0.7f, icon = R.drawable.ic_key_up, name = "Up"),
                    DraggableButton(key = "left", x = 0.24f, y = 0.66f,height = 0.5f, width = 0.5f, icon = R.drawable.ic_key_left, name = "Left"),
                    DraggableButton(key = "down", x = 0.31f, y = 0.80f,height = 0.5f, width = 0.5f, icon = R.drawable.ic_key_down, name = "Down"),
                    DraggableButton(key = "right", x = 0.38f, y = 0.66f,height = 0.5f, width = 0.5f, icon = R.drawable.ic_key_right, name = "Right"),
                    DraggableButton(key = "x", x = 0.86f, y = 0.6f,height = 0.5f, width = 0.5f, icon = R.drawable.ic_x_key, name = "X"),
                    DraggableButton(key = "c", x = 0.93f, y = 0.45f,height = 0.5f, width = 0.5f, icon = R.drawable.ic_circle_key, name = "Circle"),
                    DraggableButton(key = "z", x = 0.79f, y = 0.45f,height = 0.5f, width = 0.5f, icon = R.drawable.ic_square_key, name = "Square"),
                    DraggableButton(key = "v", x = 0.86f, y = 0.3f,height = 0.5f, width = 0.5f, icon = R.drawable.ic_triangle_key, name = "Triangle"),
                    DraggableButton(key = "l1", x = 0.21f, y = 0.05f,height = 0.5f, width = 0.5f, icon = R.drawable.ic_key_l, name = "L1"),
                    DraggableButton(key = "r1", x = 0.83f, y = 0.05f,height = 0.5f, width = 0.5f, icon = R.drawable.ic_key_r, name = "R1"),
                    DraggableButton(key = "l2", x = 0.08f, y = 0.1f,height = 0.5f, width = 0.5f, icon = R.drawable.ic_key_l, name = "L2"),
                    DraggableButton(key = "r2", x = 0.95f, y = 0.12f,height = 0.5f, width = 0.5f, icon = R.drawable.ic_key_r, name = "R2"),
                    DraggableButton(key = "select", x = 0.6f, y = 0.3f,height = 0.05f, width = 0.05f, icon = R.drawable.ic_hamburger, name = "Select"),
                    DraggableButton(key = "start", x = 0.43f, y = 0.3f,height = 0.05f, width = 0.05f, icon = R.drawable.ic_recent, name = "Start"),
                )

                // Insert buttons into the database
                    buttonDao.deleteAllButtons()
                defaultButtons.forEach {
                    buttonDao.insertButton(it)
                }

                // Update the first launch flag
                firstLaunchDao.insertFirstLaunch(FirstLaunch(id = 0, isFirstLaunch = false))
            }
        }
        setContent {

//            val sharedViewMode = getViewModel<SharedViewModel>()
//            val systemUiController = rememberSystemUiController()
//            SideEffect {
//                systemUiController.isSystemBarsVisible = false // Hide both status and navigation bars
//            }

//            val windowInsertController = WindowCompat.getInsetsController(window, window.decorView)
//            windowInsertController.hide(WindowInsetsCompat.Type.systemBars())
            val wxProfile by sharedViewModel.wxProfile.collectAsStateWithLifecycle()
            val navController = rememberNavController()
            val scope = rememberCoroutineScope()


            val snackbarHostState = remember {
                SnackbarHostState()
            }


            ObserveAsEvents(
                flow = SnackBarController.events,
                snackbarHostState
            ) { event ->
                scope.launch {
                    Log.d("MainActivity", "Snackbar Message: ${event.message}")
                    val result = snackbarHostState.showSnackbar(
                        message = event.message,
                        actionLabel = event.action?.name,
                        duration = SnackbarDuration.Short
                    )
                    if (result == SnackbarResult.ActionPerformed) {
                        event.action?.action?.invoke()
                    }
                }
            }


            WatchpartyTheme {



                Scaffold(modifier = Modifier.fillMaxSize(),
                    snackbarHost = {
                        SnackbarHost(
                            hostState = snackbarHostState,
                        )
                    },
                    )
                { innerPadding ->



                    NavHost(navController = navController, startDestination = NavGamePadScreen) {
//                            composable<NavChooseLoginScreen> {
//                                ChooseLoginScreen(onAddRetailerClick = { tlIcon, shopIcon,whoIs ->
//                                    navController.navigate(NavSendOtpScreen(tlIcon, shopIcon,whoIs))
//                                },  = this@composable)
//                            }

                        composable<NavGamePadScreen> {
                            GamePadUI(
                                wxProfile = wxProfile?: WxProfile(),
                                innerPadding,
                                gamePadViewModel,
                                connectionViewModel,
                                onScanClick = {
                                    if (areAllPermissionsGranted()) {
                                        navController.navigate(NavScanQrScreen)
                                    } else {
                                        requestPermissionsIfNeeded()
                                    }
                                },

                            )
                        }
                        

                        composable<NavScanQrScreen> {
                            ScanQrScreen(
                                onBarcodeDetected = {
                                    connectionViewModel.validateQrCode()
                                },
                                scanViewModel = connectionViewModel,
                                onConnectSuccess = {
                                    navController.navigate(NavGamePadScreen)
                                }
                            )

                        }

                    }




                }
            }
        }
    }



        fun areAllPermissionsGranted(): Boolean {
        return permissions.all { ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED }
    }


    private fun showErrorDialog() {
        AlertDialog.Builder(this)
            .setTitle("Permission Denied")
            .setMessage("Camera,location and location permission is required for this feature. Without it, the app cannot function properly.")
            .setPositiveButton("Go to Settings") { _, _ ->
                // Open app settings
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                val uri = Uri.fromParts("package", packageName, null)
                intent.data = uri
                startActivity(intent)
            }
            .setNegativeButton("Cancel", null)
            .create()
            .show()
    }


    private val requestPermissionsLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { permissions ->
            if (permissions.values.all { it }) {
            } else {
                // Handle the case where permissions are denied again
                if (permissions[Manifest.permission.CAMERA] == false || permissions[Manifest.permission.ACCESS_FINE_LOCATION] == false) {
                    showErrorDialog() // Show an error dialog if permissions are denied
                }
            }
        }
    fun requestPermissionsIfNeeded() {
        if (!areAllPermissionsGranted()) {
            if (ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.CAMERA)) {
                showErrorDialog()
            } else {
                requestPermissionsLauncher.launch(permissions)
            }
        }
    }
    companion object {
        private const val LOCATION_SETTINGS_REQUEST_CODE = 1001
    }
}

